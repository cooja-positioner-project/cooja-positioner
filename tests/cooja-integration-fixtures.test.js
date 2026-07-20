'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  AdapterValidationError,
  createArtifact,
  validateCoojaOutput
} = require('../simulator-adapters.js');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readFixture(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8').trimEnd();
}

function canonicalScenario(document) {
  return { scenario: document.scenario, waypoints: document.waypoints };
}

const mobile = readJson('integrations/scenarios/mobile-waypoints.json');
const fixed = readJson('integrations/scenarios/static-three-nodes.json');
const mobileArtifact = createArtifact('cooja', canonicalScenario(mobile));
const staticFixture = readFixture('integrations/cooja/static/positions.dat');

assert.equal(
  mobileArtifact.text,
  readFixture('integrations/cooja/mobile/positions.dat'),
  'The executed Cooja mobile fixture must be byte-equivalent to current adapter output.'
);
const staticFormatReport = validateCoojaOutput(staticFixture, canonicalScenario(fixed));
assert.equal(staticFormatReport.valid, true, staticFormatReport.errors.join(' '));
assert.ok(
  staticFormatReport.rows.every(row => row.time === 0),
  'The fixed-scenario fixture is expected to expose the zero-period Mobility wrap risk.'
);
assert.throws(
  () => createArtifact('cooja', canonicalScenario(fixed)),
  error => error instanceof AdapterValidationError && /static Cooja export is disabled/i.test(error.message)
);

console.log('cooja-integration-fixtures: mobile execution chain and static rejection passed');
