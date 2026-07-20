# Cooja parser-execution integration

This package connects the browser adapter's exact `positions.dat` output to the
real `org.contikios.cooja.plugins.Mobility` parser in a pinned Cooja checkout.
It is intentionally narrower than a network-protocol experiment: the test
measures whether Cooja loads the artifact and applies its coordinates at the
specified simulation times.

## Reproduce

Use the Contiki-NG and Cooja revisions recorded in `../toolchains.json`, then run:

```bash
node tests/cooja-integration-fixtures.test.js
CONTIKI_NG=/path/to/contiki-ng node tests/run-cooja-integration.js --require-toolchain
```

The first command proves that the committed file loaded by Cooja is exactly the
current adapter output. The second uses Cooja's built-in Java application mote,
starts Cooja without a GUI, and executes five generated checkpoint simulations
from `mobile/mobile-template.csc`. No test firmware or network protocol is
involved. The machine-readable report is written to
`../results/cooja-mobile-report.json`.

## Compatibility boundary discovered by the audit

For the pinned Cooja revision, `Mobility.java` consumes four values from each
row: zero-based mote-array index, time in seconds, X, and Y. Although the
adapter emits a fifth Z value, the plugin does not consume it and preserves the
mote's existing Z coordinate. The plugin also has `WRAP_MOVES=true`.

These details have two consequences:

1. The terminal mobile waypoint is applied and immediately followed by the
   first waypoint at the same simulation time, so it is not a stable final
   state.
2. A static export whose rows all have time zero creates a zero-duration wrap
   period. The committed static file is therefore retained as an exact negative
   compatibility fixture and is not presented as a passing Cooja execution.

Accordingly, a successful mobile test supports only planar, index-addressed,
cyclic Mobility execution. It does not support a claim of general 3-D or static
`positions.dat` interoperability.

The application adapter enforces this boundary. It rejects fixed Cooja
scenarios and mobile scenarios containing a nonzero local Z value before a
downloadable artifact is created. For accepted planar mobile scenarios, the
artifact and the browser output panel report the cyclic and mote-index mapping
semantics explicitly.
