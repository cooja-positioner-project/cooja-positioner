# ns-3 parser-execution integration

This package verifies that traces emitted by the browser's ns-3 adapter are
consumed with the intended semantics by the real `ns3::Ns2MobilityHelper`.
The verifier reads positions from ns-3 `MobilityModel` objects; it does not
independently re-parse the Tcl artifact.

## Pinned toolchain and reproduction

The tested release, official archive URL, and published SHA-1 checksum are
recorded in `../toolchains.json`. After extracting that release, run:

```bash
node tests/ns3-integration-fixtures.test.js
NS3_ROOT=/path/to/ns-3.47 node tests/run-ns3-integration.js --require-toolchain
```

The fixture test establishes byte equality between both committed traces and
the current adapter output. The second command copies the dedicated verifier
to ns-3's `scratch` directory, configures an optimized build limited to the
`core`, `network`, and `mobility` modules,
and executes the mobile and static artifacts through `Ns2MobilityHelper`.
Its machine-readable result is written to
`../results/ns3-integration-report.json`.

## Acceptance boundary

The mobile experiment checks the initial position, six interior segment
positions, and the stable terminal position. This is stricter
than checking waypoints alone: it detects incorrect segment speeds, timing,
axis mapping, and premature termination. The static experiment checks three
non-collinear nodes and therefore also exercises one-based editor identifier
to zero-based trace-index mapping. All checks use a Euclidean position-error
tolerance of `1e-6` m.

The result supports parser-level interoperability for planar static scenarios
and planar mobile scenarios with constant altitude in the pinned ns-3 release.
It does not establish compatibility for changing-altitude `setdest` traces,
arbitrary ns-3 releases, radio/channel behavior, or protocol performance.
