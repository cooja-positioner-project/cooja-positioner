# Deployment-to-Cooja case-study dataset

This directory contains a selected port-area case used with Cooja. It is a reproducibility/case-study artifact, not a universal wireless or localization benchmark.

## Files

- `geo_coordinates.csv`: WGS84 route points for five nominal trajectory steps.
- `cooja_positions.csv`: corresponding local Cooja coordinates.
- `packet_receptions.csv`: recorded packet receptions with receiver/anchor positions and RSSI.
- `scenario_summary.csv`: packet-observation counts for the 25 radio-range/trajectory-step configurations.

`radio_range_m` is the configured simulation transmission range and `trajectory_step_m` is the nominal mobile-anchor route spacing. Coordinate units are metres unless otherwise stated; RSSI is in dBm. The mobile anchor is Cooja mote-array index 100 and firmware mote ID 101.

The deployment contained 100 stationary unknown nodes. The observer script excluded mote ID 100, so packet-derived statistics use a `receiver_scope` of 99 without extrapolation. Initial zero-position records represent the stationary hold before anchor movement. Different propagation, path-loss, protocol, or firmware configurations are expected to produce different reception patterns.
