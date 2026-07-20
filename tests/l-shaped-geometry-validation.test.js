'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(root, 'integrations/scenarios/l-shaped-image-registration.json');
const reportPath = path.join(root, 'integrations/results/l-shaped-geometry-report.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function mean(points) {
  return points.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0])
    .map(value => value / points.length);
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function wrapRadians(value) {
  let wrapped = value;
  while (wrapped <= -Math.PI) wrapped += 2 * Math.PI;
  while (wrapped > Math.PI) wrapped -= 2 * Math.PI;
  return wrapped;
}

function turns(points) {
  const bearings = points.slice(1).map((point, index) =>
    Math.atan2(point[1] - points[index][1], point[0] - points[index][0]));
  return bearings.slice(1).map((bearing, index) => wrapRadians(bearing - bearings[index]));
}

function rms(values) {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
}

assert.equal(fixture.schemaVersion, 1);
assert.equal(fixture.points.length, 33);
fixture.points.forEach((point, index) => {
  assert.equal(point.nodeId, index + 1, 'Node identifiers must be contiguous and ordered.');
  assert.equal(point.editor.length, 2);
  assert.equal(point.cooja.length, 2);
});

for (const image of [fixture.source.editorImage, fixture.source.coojaImage]) {
  assert.equal(sha256(path.join(root, image.path)), image.sha256, `${image.path} digest drifted.`);
}

const editor = fixture.points.map(point => point.editor);
const cooja = fixture.points.map(point => point.cooja);
const editorMean = mean(editor);
const coojaMean = mean(cooja);
const centeredEditor = editor.map(point => [point[0] - editorMean[0], point[1] - editorMean[1]]);
const centeredCooja = cooja.map(point => [point[0] - coojaMean[0], point[1] - coojaMean[1]]);

let denominator = 0;
let dot = 0;
let cross = 0;
for (let index = 0; index < centeredEditor.length; index++) {
  const [ax, ay] = centeredEditor[index];
  const [bx, by] = centeredCooja[index];
  denominator += ax * ax + ay * ay;
  dot += ax * bx + ay * by;
  cross += ax * by - ay * bx;
}
const real = dot / denominator;
const imaginary = cross / denominator;
const scale = Math.hypot(real, imaginary);
const rotationRadians = Math.atan2(imaginary, real);
const translation = [
  coojaMean[0] - (real * editorMean[0] - imaginary * editorMean[1]),
  coojaMean[1] - (imaginary * editorMean[0] + real * editorMean[1])
];
const projected = editor.map(([x, y]) => [
  real * x - imaginary * y + translation[0],
  imaginary * x + real * y + translation[1]
]);
const nodeErrors = projected.map((point, index) => distance(point, cooja[index]));

const editorSegmentLengths = editor.slice(1).map((point, index) => distance(point, editor[index]) * scale);
const coojaSegmentLengths = cooja.slice(1).map((point, index) => distance(point, cooja[index]));
const segmentAbsoluteErrors = editorSegmentLengths.map(
  (length, index) => Math.abs(length - coojaSegmentLengths[index]));
const segmentRelativeErrors = segmentAbsoluteErrors.map(
  (error, index) => error / coojaSegmentLengths[index]);
const editorTurns = turns(editor);
const coojaTurns = turns(cooja);
const turnErrorsDegrees = editorTurns.map(
  (turn, index) => Math.abs(wrapRadians(turn - coojaTurns[index])) * 180 / Math.PI);

const coojaWidth = Math.max(...cooja.map(point => point[0])) - Math.min(...cooja.map(point => point[0]));
const coojaHeight = Math.max(...cooja.map(point => point[1])) - Math.min(...cooja.map(point => point[1]));
const coojaDiagonal = Math.hypot(coojaWidth, coojaHeight);
const metrics = {
  matchedNodeCount: fixture.points.length,
  fittedScale: scale,
  fittedRotationDegrees: rotationRadians * 180 / Math.PI,
  rmsNodeResidualPixels: rms(nodeErrors),
  maximumNodeResidualPixels: Math.max(...nodeErrors),
  maximumNodeResidualNodeId: nodeErrors.indexOf(Math.max(...nodeErrors)) + 1,
  normalizedRmsResidualPercentOfCoojaDiagonal: rms(nodeErrors) / coojaDiagonal * 100,
  meanAdjacentSegmentLengthErrorPixels: segmentAbsoluteErrors.reduce((a, b) => a + b, 0) / segmentAbsoluteErrors.length,
  meanAdjacentSegmentLengthErrorPercent: segmentRelativeErrors.reduce((a, b) => a + b, 0) / segmentRelativeErrors.length * 100,
  maximumAdjacentSegmentLengthErrorPercent: Math.max(...segmentRelativeErrors) * 100,
  meanTurningAngleErrorDegrees: turnErrorsDegrees.reduce((a, b) => a + b, 0) / turnErrorsDegrees.length,
  maximumTurningAngleErrorDegrees: Math.max(...turnErrorsDegrees)
};
const acceptance = {
  maximumRmsNodeResidualPixels: 2,
  maximumNodeResidualPixels: 4,
  maximumNormalizedRmsResidualPercentOfCoojaDiagonal: 0.15,
  maximumMeanAdjacentSegmentLengthErrorPercent: 3,
  maximumMeanTurningAngleErrorDegrees: 2.5
};

assert.ok(metrics.rmsNodeResidualPixels <= acceptance.maximumRmsNodeResidualPixels);
assert.ok(metrics.maximumNodeResidualPixels <= acceptance.maximumNodeResidualPixels);
assert.ok(
  metrics.normalizedRmsResidualPercentOfCoojaDiagonal <=
    acceptance.maximumNormalizedRmsResidualPercentOfCoojaDiagonal);
assert.ok(
  metrics.meanAdjacentSegmentLengthErrorPercent <=
    acceptance.maximumMeanAdjacentSegmentLengthErrorPercent);
assert.ok(metrics.meanTurningAngleErrorDegrees <= acceptance.maximumMeanTurningAngleErrorDegrees);

const report = {
  schemaVersion: 1,
  status: 'PASS',
  evidenceLevel: 'retrospective raster registration; not a metre-level coordinate-accuracy test',
  fixture: path.relative(root, fixturePath),
  sources: fixture.source,
  method: {
    model: 'least-squares orientation-preserving 2-D similarity transform',
    nuisanceParametersRemoved: ['translation', 'rotation', 'uniform screenshot scale'],
    coordinateConvention: fixture.coordinateConvention
  },
  acceptance,
  metrics,
  nodeResidualsPixels: fixture.points.map((point, index) => ({
    nodeId: point.nodeId,
    residualPixels: nodeErrors[index]
  }))
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `l-shaped-geometry: ${metrics.matchedNodeCount} nodes, ` +
  `RMS=${metrics.rmsNodeResidualPixels.toFixed(3)} px, ` +
  `normalized=${metrics.normalizedRmsResidualPercentOfCoojaDiagonal.toFixed(3)}%, ` +
  `segment MAPE=${metrics.meanAdjacentSegmentLengthErrorPercent.toFixed(3)}%, ` +
  `turn MAE=${metrics.meanTurningAngleErrorDegrees.toFixed(3)} deg; PASS`);
