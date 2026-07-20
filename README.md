# Cooja Positioner

Cooja Positioner is a client-side, browser-based editor for authoring geographically grounded WSN and IoT scenarios. It preserves WGS84 positions, node identifiers, waypoint timing, altitude, and the local-origin policy, then exports simulator-specific position or mobility artifacts for Cooja, ns-2, ns-3, and INET/OMNeT++.

**Online application:** https://cooja-positioner-project.github.io/

No application server is required. Map tiles and place search currently use external OpenStreetMap and Nominatim services, so those functions require network access.

## What it is for

The tool connects field-oriented deployment planning with simulator setup. A user can mark exact map positions, retain stable node IDs that may later be associated with firmware or protocol roles, generate regularly spaced nodes inside a polygon, or create a mobile scan route over a selected area. The tool does not assign network roles, predict coverage, or replace the target simulator's radio, protocol, energy, or firmware models.

## Features

### Scenario authoring

- **Mobile scenario:** one node ID with ordered waypoints and increasing timestamps.
- **Static scenario:** multiple node IDs with zero-time placements.
- **Point Mode:** manually add, drag, rename, select, and delete geographic points.
- **Polygon Mode — static:** generate an approximately hexagonal regular deployment inside a user-drawn polygon using the selected metre spacing.
- **Polygon Mode — mobile:** generate a horizontal or vertical lawn-mower/scan path inside a polygon.
- **Circle guide:** display a selectable 10–50 m placement guide. It is a geometric aid, not a connectivity guarantee.
- Undo/redo, multi-selection, keyboard shortcuts, text input, and Cooja position import.

### Coordinate model

- Canonical geographic state in **WGS84 / EPSG:4326**.
- WGS84 geodetic → ECEF → local ENU transformation.
- **First input row** origin policy: the first valid waypoint becomes local `(0, 0)`.
- **Custom WGS84 origin** policy: offsets are retained from a fixed user-specified reference.
- Coordinate results are independent of map pan, zoom, and viewport state.
- Geographic altitude is retained in the canonical scenario; each export adapter enforces its supported dimensionality.

### Simulator exports

| Target | Generated file | Current evidence boundary |
|---|---|---|
| Cooja Mobility | `positions.dat` | Planar mobile trace; zero-based mote-array index; tested plugin is cyclic. Static and nonzero-Z exports are rejected. |
| ns-2 | `mobility-ns2.tcl` | Static initialization and planar `setdest` mobility statements. |
| ns-3 | `mobility-ns3.tcl` | Consumed through `Ns2MobilityHelper`; static and planar mobile fixtures tested with ns-3.47. |
| INET/OMNeT++ | `mobility-bonnmotion.movements` | Planar BonnMotion `t x y` triplets; tested with OMNeT++ 6.4.0 and INET 4.7.0. |

The adapter warnings shown by the application are part of the supported behavior. Format-level validation does not imply arbitrary-version simulator compatibility.

## Quick start

1. Open https://cooja-positioner-project.github.io/ or open `index.html` locally in a modern browser.
2. Search for the target area and choose **Mobile** or **Static**.
3. Select **Point Mode** for manual placement or **Polygon Mode** for generated deployment/scan paths.
4. Choose the **XY Origin** policy.
5. Add points, draw a polygon, or paste rows in this form:

   ```text
   node_id time_s latitude_deg longitude_deg [altitude_m]
   ```

6. Select the target simulator and press **Convert**.
7. Review compatibility warnings, then use **Copy** or **Save export**.

Polygon drawing is completed with **Enter** or a double-click and cancelled with **Esc**.

## Important identifier convention

Editor node IDs are one-based. The tested Cooja Mobility plugin selects motes by zero-based simulation-array index. Therefore, editor node ID 101 is exported as Cooja mote index 100. This is an array position, not the firmware mote ID field stored in a `.csc` file.

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Select all | Ctrl+A |
| Multiple selection | Ctrl+Shift+Click |
| Delete selected | Del / Backspace |
| Undo | Ctrl+Z |
| Redo | Ctrl+Y or Ctrl+Shift+Z |
| Show shortcut overlay | Ctrl+? |
| Finish polygon | Enter |
| Cancel polygon | Esc |

## Case-study dataset

[`artifacts/case-study-dataset/`](artifacts/case-study-dataset/) contains a deployment-to-Cooja case-study artifact:

- `geo_coordinates.csv` — five geographic mobile-anchor trajectories with nominal steps of 10, 20, 30, 40, and 50 m.
- `cooja_positions.csv` — corresponding local Cooja positions.
- `packet_receptions.csv` — receiver/anchor positions and RSSI for 25 radio-range/trajectory-step configurations.
- `scenario_summary.csv` — packet-observation counts derived from the 25 cleaned traces.

The deployment contained 100 stationary unknown nodes and one mobile anchor. The experiment observer excluded mote ID 100, so packet-derived summaries use the 99 retained stationary-node traces and are not extrapolated to 100. The packet traces depend on the configured Cooja radio and scenario model; they are reproducibility material, not universal wireless measurements or a localization benchmark.

## Validation and tests

The repository separates the coordinate core from simulator adapters:

- `coordinate-core.js` — WGS84/ECEF/ENU transformations.
- `simulator-adapters.js` — target-specific serialization, parsing, guards, and warnings.
- `tests/` — coordinate, adapter, fixture, and integration runners.
- `integrations/` — pinned fixtures, verifier sources, toolchain metadata, and machine-readable reports.

Run dependency-free checks with Node.js:

```bash
node tests/coordinate-core.test.js
node tests/simulator-adapters.test.js
node tests/cooja-integration-fixtures.test.js
node tests/ns3-integration-fixtures.test.js
node tests/inet-integration-fixtures.test.js
node tests/l-shaped-geometry-validation.test.js
```

The real simulator runners require separately installed, pinned toolchains. See [`tests/SIMULATOR_INTEGRATION.md`](tests/SIMULATOR_INTEGRATION.md) and the target-specific README files under [`integrations/`](integrations/).

## Repository layout

```text
index.html                         Browser application
coordinate-core.js                 Coordinate transformation core
simulator-adapters.js              Simulator adapter registry
keyboard_shortcuts.html            Standalone shortcut reference
tests/                             Automated checks and runners
integrations/                      Fixtures, verifier code, and reports
artifacts/case-study-dataset/      Geographic, Cooja, packet, and summary CSVs
docs/                              Evidence and documentation notes
media/                             Images used by validation/documentation
```

## Video and screenshots

The currently committed demonstration video and screenshots show an earlier interface revision. They remain available for historical orientation, but do not yet demonstrate polygon deployment, custom-origin selection, or all simulator exports. A new video will replace them.

- [Earlier-version demonstration video](Cooja%20positioner_%20An%20Interactive%20Web-Based%20Tool%20for%20Node%20Positioning%20in%20the%20Cooja%20Simulator.mp4)
- [Earlier main-interface screenshot](preview.png)

## Citation

Citation metadata will be updated with the final article record after publication. During anonymous review, use:

```bibtex
@misc{cooja-positioner,
  title        = {Cooja Positioner: A Browser-Based Geo-Scenario Editor for WSN Simulations},
  author       = {Anonymous Authors},
  year         = {2026},
  howpublished = {\url{https://github.com/cooja-positioner-project/cooja-positioner}},
  note         = {Software and reproducibility artifacts}
}
```

## License

See [`LICENSE`](LICENSE).
