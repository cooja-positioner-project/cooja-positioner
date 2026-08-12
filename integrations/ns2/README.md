# ns-2 parser-execution integration

This package verifies that traces emitted by the browser's ns-2 adapter are
consumed with the intended semantics by the real ns-2 CMU wireless mobility
model (`MobileNode`, `common/mobilenode.cc`). The verifier reads positions
back from `MobileNode` state; it does not independently re-parse the Tcl
artifact.

## Pinned toolchain and reproduction

The tested release, upstream source archive URL, and its verified SHA-1
checksum are recorded in `../toolchains.json`. Any `ns` binary built from
that pinned source (for example, the Debian/Ubuntu `ns2` package built from
the same upstream archive) can be used. After installing it, run:

```bash
node tests/ns2-integration-fixtures.test.js
NS2_BIN=ns node tests/run-ns2-integration.js --require-toolchain
```

The fixture test establishes byte equality between both committed traces and
the current adapter output. The second command runs the dedicated Tcl
verifier under the real `ns` binary for the mobile and static artifacts.
Its machine-readable result is written to
`../results/ns2-integration-report.json`.

## Why the verifier looks unusual

Real ns-2's `MobileNode` does not expose a direct Tcl accessor for a node's
live, continuously interpolated position: the bound `X_`/`Y_` Tcl variables
are only refreshed lazily, inside `MobileNode::update_position()`. The
verifier forces that refresh through the `log-movement` command, which calls
`update_position()` before an otherwise inert log write (no log target is
attached in this harness, so the write itself is a no-op). This is the same
linear-interpolation logic the CMU model uses internally; it is not a
custom or patched behavior.

Separately, ns-2's `Topography`/`God` bookkeeping rejects negative
coordinates, which the mobile fixture contains. The runner therefore sources
a uniformly offset scratch copy of the committed trace and subtracts the
offset back from the sampled positions before comparison. The offset is a
grid-bounds workaround only; it does not change the mobility grammar under
test, and the committed fixture files themselves are never modified.

## Acceptance boundary

The same eight mobile checkpoints (initial state, six interior segment
positions, and the terminal hold) and three static checkpoints used for the
ns-3 experiment are re-evaluated here against an independent execution path.
All checks use a Euclidean position-error tolerance of `1e-6` m.

The result supports parser-level interoperability for planar static
scenarios and planar mobile scenarios with constant altitude in the pinned
ns-2 release. It does not establish compatibility for changing-altitude
`setdest` traces, arbitrary ns-2 releases, radio/channel behavior, or
protocol performance.
