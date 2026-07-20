'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'integrations/toolchains.json'), 'utf8'));
const requireToolchain = process.argv.includes('--require-toolchain');
const contikiRoot = process.env.CONTIKI_NG ? path.resolve(process.env.CONTIKI_NG) : null;
const resultsDir = path.join(root, 'integrations/results');
const runtimeLogDir = path.join(resultsDir, 'cooja-runtime');
const reportPath = path.join(resultsDir, 'cooja-mobile-report.json');
const observationsPath = path.join(runtimeLogDir, 'checkpoint-observations.log');
const templatePath = path.join(root, 'integrations/cooja/mobile/mobile-template.csc');
const positionsPath = path.join(root, 'integrations/cooja/mobile/positions.dat');

const checkpoints = [
  { label: 'waypoint-t0', timeoutMs: 200, x: 0, y: 0, z: 0 },
  { label: 'waypoint-t2', timeoutMs: 2200, x: 3, y: -4, z: 0 },
  { label: 'waypoint-t5', timeoutMs: 5200, x: -2, y: -4, z: 0 },
  { label: 'hold-before-t9', timeoutMs: 8800, x: -2, y: -4, z: 0 },
  { label: 'wrapped-after-t9', timeoutMs: 9200, x: 0, y: 0, z: 0 }
];

function finish(status, message, code) {
  console.log(`[${status}] cooja: ${message}`);
  process.exitCode = code;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function revision(directory) {
  const result = spawnSync('git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function generateCheckpointScenarios() {
  const template = fs.readFileSync(templatePath, 'utf8');
  fs.mkdirSync(runtimeLogDir, { recursive: true });
  fs.writeFileSync(observationsPath, '');
  const generatedScenarioDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cooja-positioner-'));
  return checkpoints.map(checkpoint => {
    const scenarioPath = path.join(generatedScenarioDir, `${checkpoint.label}.csc`);
    const replacements = {
      '@LABEL@': checkpoint.label,
      '@POSITIONS_FILE@': xmlEscape(positionsPath),
      '@OBSERVATIONS_FILE@': xmlEscape(observationsPath),
      '@TIMEOUT_MS@': checkpoint.timeoutMs,
      '@EXPECTED_X@': checkpoint.x,
      '@EXPECTED_Y@': checkpoint.y,
      '@EXPECTED_Z@': checkpoint.z,
      '@TOLERANCE@': 1e-9
    };
    let scenario = template;
    for (const [token, value] of Object.entries(replacements)) {
      scenario = scenario.replaceAll(token, String(value));
    }
    fs.writeFileSync(scenarioPath, scenario);
    return scenarioPath;
  });
}

if (!contikiRoot) {
  finish(
    'SKIP',
    'CONTIKI_NG is not set; point it to the pinned Contiki-NG checkout to execute Cooja.',
    requireToolchain ? 2 : 0
  );
} else {
  const coojaRoot = path.join(contikiRoot, 'tools', 'cooja');
  const gradlew = path.join(coojaRoot, 'gradlew');
  const mobilitySource = path.join(coojaRoot, manifest.cooja.mobilityPlugin.sourcePath);

  if (!fs.existsSync(gradlew) || !fs.existsSync(mobilitySource) || !fs.existsSync(templatePath)) {
    finish('SKIP', 'The requested checkout does not contain Cooja Gradle or Mobility sources.', requireToolchain ? 2 : 0);
  } else {
    const source = fs.readFileSync(mobilitySource, 'utf8');
    const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
    const expectedSha256 = manifest.cooja.mobilityPlugin.sourceSha256;

    const audit = {
      exactSourceMatch: sourceSha256 === expectedSha256,
      zeroBasedMoteIndex: source.includes('Integer.parseInt(args[0])'),
      timeFromSecondField: source.includes('Double.parseDouble(args[1])'),
      xyFromThirdAndFourthFields:
        source.includes('Double.parseDouble(args[2])') && source.includes('Double.parseDouble(args[3])'),
      zFieldConsumed: source.includes('Double.parseDouble(args[4])'),
      wrapMoves: /WRAP_MOVES\s*=\s*true/.test(source),
      actualContikiNgRevision: revision(contikiRoot),
      actualCoojaRevision: revision(coojaRoot)
    };

    const pinnedRevisionsMatch =
      audit.actualContikiNgRevision === manifest.cooja.contikiNgRevision &&
      audit.actualCoojaRevision === manifest.cooja.coojaRevision;

    if (!audit.exactSourceMatch || !pinnedRevisionsMatch) {
      finish(
        'FAIL',
        `Toolchain mismatch: Mobility SHA-256=${sourceSha256}, Contiki-NG=${audit.actualContikiNgRevision}, Cooja=${audit.actualCoojaRevision}.`,
        1
      );
    } else {
      const scenarios = generateCheckpointScenarios();

      const argsValue = [
        '--no-gui',
        '--no-log-color',
        `--logdir=${runtimeLogDir}`,
        `--contiki=${contikiRoot}`,
        ...scenarios
      ].join(' ');

      const startedAt = new Date().toISOString();
      const run = spawnSync(gradlew, ['--no-daemon', 'run', `--args=${argsValue}`], {
        cwd: coojaRoot,
        encoding: 'utf8',
        timeout: 180000,
        maxBuffer: 16 * 1024 * 1024,
        env: {
          ...process.env,
          CI: '1',
          CONTIKI: contikiRoot
        }
      });

      const combinedOutput = `${run.stdout || ''}\n${run.stderr || ''}`;
      const persistedObservations = fs.existsSync(observationsPath)
        ? fs.readFileSync(observationsPath, 'utf8')
        : '';
      const checkLines = `${combinedOutput}\n${persistedObservations}`
        .split(/\r?\n/)
        .filter(line => line.includes('COOJA_CHECK') || line.includes('COOJA_RESULT'));
      const testOkCount = (combinedOutput.match(/TEST OK/g) || []).length;
      const everyCheckpointObserved = checkpoints.every(checkpoint =>
        checkLines.some(line => line.includes(`label=${checkpoint.label}`) && line.includes('error_m=0'))
      );
      const positionErrors = checkLines.map(line => {
        const match = line.match(/error_m=([-+0-9.eE]+)/);
        return match ? Number(match[1]) : Number.NaN;
      }).filter(Number.isFinite);
      const report = {
        schemaVersion: 1,
        status:
          run.status === 0 && testOkCount === checkpoints.length && everyCheckpointObserved
            ? 'PASS'
            : 'FAIL',
        startedAt,
        completedAt: new Date().toISOString(),
        command: './gradlew --no-daemon run --args=<headless Cooja arguments>',
        toolchain: {
          contikiNgRevision: manifest.cooja.contikiNgRevision,
          coojaRevision: manifest.cooja.coojaRevision,
          mobilitySourceSha256: sourceSha256
        },
        sourceAudit: audit,
        observations: {
          checkLines,
          checkpointCount: checkLines.length,
          maximumPositionErrorMeters: positionErrors.length ? Math.max(...positionErrors) : null,
          wrapObserved: checkLines.some(line => line.includes('wrapped-after-t9')),
          terminalWaypointIsStable: false,
          staticZeroPeriodRisk: true,
          zFieldConsumedByPlugin: audit.zFieldConsumed
        },
        process: {
          exitCode: run.status,
          signal: run.signal,
          timedOut: Boolean(run.error && run.error.code === 'ETIMEDOUT'),
          expectedTestCount: checkpoints.length,
          observedTestOkCount: testOkCount
        }
      };

      fs.mkdirSync(resultsDir, { recursive: true });
      fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

      if (report.status === 'PASS') {
        finish('PASS', `real Mobility parser execution passed; report: ${path.relative(root, reportPath)}`, 0);
      } else {
        console.error(combinedOutput);
        finish('FAIL', `Cooja exited without TEST OK; report: ${path.relative(root, reportPath)}`, 1);
      }
    }
  }
}
