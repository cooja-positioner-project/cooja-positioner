'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'integrations/toolchains.json'), 'utf8'));
const requireToolchain = process.argv.includes('--require-toolchain');
const ns2Bin = process.env.NS2_BIN || 'ns';
const resultsDir = path.join(root, 'integrations/results');
const reportPath = path.join(resultsDir, 'ns2-integration-report.json');
const verifierPath = path.join(root, manifest.ns2.executionProgram);
const tolerance = 1e-6;

// ns-2's Topography/God bookkeeping rejects negative coordinates. Every
// committed fixture is real, unshifted adapter output; this offset is
// applied only to a scratch copy fed to the real /usr/bin/ns execution, and
// undone inside the verifier before comparison. It does not change the
// mobility grammar under test.
const GRID_OFFSET = 20000;

const scenarios = [
  { id: 'mobile', tracePath: path.join(root, 'integrations/ns2/mobile/mobility-ns2.tcl'), expectedCheckCount: 8 },
  { id: 'static', tracePath: path.join(root, 'integrations/ns2/static/mobility-ns2.tcl'), expectedCheckCount: 3 }
];

function finish(status, message, code) {
  console.log(`[${status}] ns2: ${message}`);
  process.exitCode = code;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function offsetTraceContent(text) {
  return text.split('\n').map(line => {
    let m = line.match(/^(\$node_\(\d+\) set [XY]_ )(-?[\d.]+)(\s*)$/);
    if (m) {
      const shifted = Number(m[2]) + GRID_OFFSET;
      return `${m[1]}${shifted.toFixed(9)}${m[3]}`;
    }
    m = line.match(/^(\$ns_ at [\d.]+ "\$node_\(\d+\) setdest )(-?[\d.]+) (-?[\d.]+) (-?[\d.]+)(")$/);
    if (m) {
      const x = Number(m[2]) + GRID_OFFSET;
      const y = Number(m[3]) + GRID_OFFSET;
      return `${m[1]}${x.toFixed(9)} ${y.toFixed(9)} ${m[4]}${m[5]}`;
    }
    return line;
  }).join('\n');
}

function parseCheckLine(line) {
  const fields = {};
  for (const token of line.trim().split(/\s+/).slice(1)) {
    const separator = token.indexOf('=');
    if (separator === -1) continue;
    fields[token.slice(0, separator)] = token.slice(separator + 1);
  }
  for (const key of ['node', 'time_s', 'expected_x', 'expected_y', 'expected_z', 'actual_x', 'actual_y', 'actual_z', 'error_m']) {
    if (key in fields) fields[key] = Number(fields[key]);
  }
  return fields;
}

function executeScenario(scenario, scratchDir) {
  const relativeTracePath = path.relative(root, scenario.tracePath);
  const originalText = fs.readFileSync(scenario.tracePath, 'utf8');
  const offsetTracePath = path.join(scratchDir, `mobility-ns2-offset-${scenario.id}.tcl`);
  fs.writeFileSync(offsetTracePath, offsetTraceContent(originalText));

  const result = spawnSync(ns2Bin, [verifierPath, offsetTracePath, scenario.id, String(GRID_OFFSET), String(tolerance)], {
    cwd: scratchDir,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 32 * 1024 * 1024
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const checkLines = output.split(/\r?\n/).filter(line => line.startsWith('NS2_CHECK '));
  const checks = checkLines.map(parseCheckLine);
  const resultLine = output.split(/\r?\n/).find(line => line.startsWith('NS2_RESULT ')) || null;
  const maximumPositionErrorMeters = checks.length
    ? Math.max(...checks.map(check => check.error_m).filter(Number.isFinite))
    : null;
  const passed =
    result.status === 0 &&
    checks.length === scenario.expectedCheckCount &&
    checks.every(check => check.status === 'PASS' && check.error_m <= tolerance) &&
    Boolean(resultLine && resultLine.includes('status=PASS'));

  return {
    scenario: scenario.id,
    status: passed ? 'PASS' : 'FAIL',
    command: `${ns2Bin} ${path.relative(root, verifierPath)} <scratch>/${path.basename(offsetTracePath)} ${scenario.id} ${GRID_OFFSET} ${tolerance}`,
    trace: {
      path: relativeTracePath,
      sha256: sha256(scenario.tracePath)
    },
    observations: {
      expectedCheckCount: scenario.expectedCheckCount,
      observedCheckCount: checks.length,
      maximumPositionErrorMeters,
      checks,
      resultLine
    },
    process: {
      exitCode: result.status,
      signal: result.signal,
      timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT')
    },
    diagnosticOutput: passed ? undefined : output.trim()
  };
}

const which = spawnSync('sh', ['-c', `command -v ${ns2Bin}`], { encoding: 'utf8' });
if (which.status !== 0) {
  finish(
    'SKIP',
    `ns-2 binary "${ns2Bin}" was not found on PATH; install the pinned ns2 build (see integrations/toolchains.json) or set NS2_BIN.`,
    requireToolchain ? 2 : 0
  );
} else {
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns2-integration-'));
  const startedAt = new Date().toISOString();
  const executions = scenarios.map(scenario => executeScenario(scenario, scratchDir));
  fs.rmSync(scratchDir, { recursive: true, force: true });

  const passed = executions.every(execution => execution.status === 'PASS');
  const errors = executions
    .map(execution => execution.observations.maximumPositionErrorMeters)
    .filter(Number.isFinite);

  const report = {
    schemaVersion: 1,
    status: passed ? 'PASS' : 'FAIL',
    startedAt,
    completedAt: new Date().toISOString(),
    toolchain: {
      release: manifest.ns2.release,
      archiveUrl: manifest.ns2.archiveUrl,
      archiveSha1: manifest.ns2.archiveSha1,
      requiredParser: manifest.ns2.requiredParser,
      binaryUsed: ns2Bin
    },
    verifier: {
      path: path.relative(root, verifierPath),
      sha256: sha256(verifierPath),
      toleranceMeters: tolerance,
      gridOffset: GRID_OFFSET
    },
    observations: {
      scenarioCount: executions.length,
      checkpointCount: executions.reduce((sum, execution) => sum + execution.observations.observedCheckCount, 0),
      maximumPositionErrorMeters: errors.length ? Math.max(...errors) : null,
      executions
    }
  };

  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  if (passed) {
    finish('PASS', `real /usr/bin/ns (MobileNode CMU model) execution passed; report: ${path.relative(root, reportPath)}`, 0);
  } else {
    console.error(executions.map(item => item.diagnosticOutput).filter(Boolean).join('\n'));
    finish('FAIL', `ns-2 execution failed; report: ${path.relative(root, reportPath)}`, 1);
  }
}
