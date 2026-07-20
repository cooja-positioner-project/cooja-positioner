# INET/OMNeT++ parser-execution integration

This package verifies that the BonnMotion files emitted by the browser adapter
are consumed with the intended semantics by the real INET
`BonnMotionMobility` module. The verifier reads positions from INET's
`IMobility` interface; it does not independently re-parse the movements file.

## Pinned toolchain and reproduction

The executed toolchain is OMNeT++ 6.4.0 with INET 4.7.0. Exact Git revisions
and SHA-256 digests of the `BonnMotionMobility` C++ and NED sources are recorded
in `../toolchains.json`. With those tagged source trees built in release mode,
run:

```bash
node tests/inet-integration-fixtures.test.js
OMNETPP_ROOT=/path/to/omnetpp-6.4.0 \
INET_ROOT=/path/to/inet-4.7.0 \
node tests/run-inet-integration.js --require-toolchain
```

The fixture test proves byte equality between both committed movement files
and current adapter output. The runner audits the pinned toolchain, compiles
the dedicated verifier as a temporary shared library, and launches both
scenarios through OMNeT++ `Cmdenv`. Its machine-readable result is written to
`../results/inet-integration-report.json`.

## Acceptance boundary

The mobile experiment checks the initial position, six interior segment
positions, and the stable terminal position. The static experiment checks
three non-collinear lines selected by `nodeId`, which exercises the adapter's
one-based editor identifier to zero-based host-line mapping. All checks use a
Euclidean position-error tolerance of `1e-6` m.

This result supports parser-level interoperability for planar static scenarios
and planar mobile scenarios in the pinned releases. It does not establish 3-D
BonnMotion input, compatibility with arbitrary releases, radio/channel
behavior, or protocol performance.
