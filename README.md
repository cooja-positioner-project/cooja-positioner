# Cooja Positioner

A web tool that converts geographic coordinates (latitude/longitude) into [Cooja](https://github.com/contiki-ng/cooja) simulator’s XY coordinate system and visualizes node positions on an interactive map. Place points on the map, then export a `positions.dat` file ready for use in Cooja.

---

## Features

- **Scenarios**
  - **Mobile** — One node over time: same node ID, increasing time (e.g. movement path).
  - **Fixed** — Multiple static nodes: unique node IDs, time always zero.

- **Map**
  - OpenStreetMap (Leaflet). Search by place name or address (Nominatim).
  - **Work modes:** Map Mode (pan/zoom) and Point Add (add/move points).

- **Points**
  - Add points by clicking; drag to move. Multi-select with Ctrl+Shift+Click; delete with Del. Undo/Redo.
  - Right-click a circle: **Rename Node-ID** or **Delete**.
  - Last clicked point is highlighted with a dashed circle.

- **I/O**
  - Paste lat/lng text and **Convert** to Cooja XY. Upload a `.dat` file to load positions on the map.
  - **positions.dat** output: `node_id time x y z` (relative meters; first point at 0,0; Y negated for Cooja).

- **Keyboard shortcuts** — Ctrl+? to open the shortcuts overlay (e.g. Ctrl+A, Del, Ctrl+Z/Y).

---

## Quick start

1. Open **`cooja_positioner_last_point_circle.html`** in a modern browser (no server required).
2. Use **Search Location** to go to a region, then set **Work Mode** to **Point Add**.
3. Choose **Scenario**: **Mobile** (one node over time) or **Fixed** (multiple nodes, time 0).
4. Click on the map to add points. Use **Copy** or **Save positions.dat** to get the output for Cooja.

---

## Screenshots

### Main interface (Map + Sidebar)

![Main interface](docs/screenshot_main.png)  
*Map view with sidebar: Search, Scenario (Mobile/Fixed), Work Mode, and position list.*

### Mobile scenario — one node, time steps

![Mobile scenario](docs/screenshot_mobile.png)  
*Mobile scenario: same node ID on all points, time column increases (0, 1, 2, …).*

### Fixed scenario — multiple nodes, time zero

![Fixed scenario](docs/screenshot_fixed.png)  
*Fixed scenario: different node IDs per point, time always 0.*

### positions.dat output

![Output](docs/screenshot_output.png)  
*Generated `positions.dat` (node_id, time, x, y, z) and Copy/Save buttons.*

> **Note:** Add your own screenshots in the `docs/` folder as `screenshot_main.png`, `screenshot_mobile.png`, `screenshot_fixed.png`, and `screenshot_output.png`, or change the paths above to match your files.

---

## Output format

The tool generates Cooja-style positions:

```
node_id time x y z
```

- Coordinates are **relative** in meters; the first point is the origin (0, 0).
- **Y** is negated to match Cooja’s coordinate system.
- **Mobile:** one `node_id`, `time` increases. **Fixed:** different `node_id` per line, `time` is 0.

---

## Keyboard shortcuts

| Action           | Shortcut           |
|------------------|--------------------|
| Select all       | Ctrl+A             |
| Multiple selection | Ctrl+Shift+Click  |
| Delete selected  | Del                |
| Undo             | Ctrl+Z             |
| Redo             | Ctrl+Y             |
| Show shortcuts   | Ctrl+?             |

---

## File

- **App (latest):** `cooja_positioner_last_point_circle.html` — open this file to use the tool.

---

## Please cite us

If you use Cooja Positioner in academic work or in a product, we would appreciate a citation.

**Plain text:**

```text
Cooja Positioner. A web tool for generating Cooja simulator position files from geographic coordinates. https://github.com/YOUR_USERNAME/cooja-positioner
```

**BibTeX:**

```bibtex
@misc{cooja-positioner,
  title        = {Cooja Positioner: Geographic to Cooja position file converter},
  author       = {YOUR_NAME},
  year         = {2025},
  howpublished = {\url{https://github.com/YOUR_USERNAME/cooja-positioner}},
  note         = {Web tool for generating positions.dat from map input}
}
```

Replace `YOUR_USERNAME` and `YOUR_NAME` with your repository URL and name. Thank you for citing this tool.
