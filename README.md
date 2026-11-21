<h1 align="center">EiCube</h1>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-000000?style=flat&logo=three.js&logoColor=white" alt="Three.js" /></a>
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest&logoColor=white" alt="Vitest" /></a>
  <a href="https://www.youtube.com/"><img src="https://img.shields.io/badge/YouTube-FF0000?style=flat&logo=youtube&logoColor=white" alt="YouTube" /></a>
</p>

---

## Overview

EiCube is an interactive 3D twisty puzzle trainer, algorithm simulator, and solving guide built with Three.js, TypeScript, and Vite. Designed for speedcubers and puzzle enthusiasts, EiCube provides a digital training environment for 3x3x3 Rubik's Cubes, 2x2x2 Pocket Cubes, 4x4x4 Rubik's Revenge, and Pyraminx regular tetrahedrons.

Unlike conventional digital cube simulators that lock rotations to static world axes, EiCube features a dynamic camera-relative rotation resolver. Every move executed by the player is resolved relative to their current viewport perspective.

> [!IMPORTANT]
> **Camera-Relative Kinematics**: Turning the **R** face always turns whichever face is currently positioned on the viewer's right side, regardless of camera orbit angle. If the camera orbits 180 degrees, pressing R automatically acts on the face now facing right, preserving intuitive tactile muscle memory.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architectural Deep Dive](#architectural-deep-dive)
  - [1. Mathematical & Kinematic Model](#1-mathematical--kinematic-model)
  - [2. Touch & Mouse Raycasting Architecture](#2-touch--mouse-raycasting-architecture)
  - [3. Multi-Puzzle Engine & State Separation](#3-multi-puzzle-engine--state-separation)
  - [4. Audio/Visual & UI Philosophy](#4-audiovisual--ui-philosophy)
- [Project Directory Structure](#project-directory-structure)
- [Verification & Test Suite](#verification--test-suite)
- [Local Development](#local-development)
- [License](#license)

---

## Key Features

- **Mouse & Touch Direct Layer Drag**:
  - Touch or click any cubie and drag along a face tangent to immediately execute that layer rotation.
  - Automatic differentiation: swiping on a cubie rotates that layer, while dragging the background smoothly orbits the camera.
  - Multi-touch pinch-to-zoom support for mobile devices.
- **Dynamic Hand Cursor**:
  - Contextual hand cursor feedback: `grab` state on hover over puzzle pieces and idle viewport, transitioning smoothly to `grabbing` during active layer drags or camera orbits.
- **Camera Perspective Locking During Drag**:
  - OrbitControls is automatically bypassed the instant a pointer contacts a puzzle piece, ensuring the camera angle remains locked and does not follow layer movements during a solve.
- **Player-Centric Move History**:
  - Scramble moves are cleanly excluded from the move history log.
  - Move history strictly records turns manually executed by the player via keyboard, on-screen pads, or touch/mouse drags.
  - Stopwatch timer starts automatically on the player's first manual move after a scramble.
- **Mobile-Friendly Ergonomics**:
  - Fixed floating thumb dock on mobile devices with quick access to Moves, Scramble, Undo, and History.
  - Slide-out drawer sidebars for keybinds and move history with tap-to-close backdrops.
  - Full-screen unobstructed 3D stage on phones and tablets.
- **Universal "Puzzle" Trainer Tab**:
  - Dynamically load and solve any puzzle: 3x3 Rubik's Cube, 2x2 Pocket Cube, 4x4 Rubik's Revenge, or Pyraminx.
  - Seamless inline quick-picker in the top floating navigation bar.
  - Dedicated move pads adapting automatically for cube layers or Pyraminx faces and tips.
  - Solved state detection, stopwatch timer (`00:00.00`), scramble, reset, undo, and animation speed slider.
- **"Other Puzzles" Tab with "Solve this version"**:
  - Explore 3x3, 2x2, 4x4, and Pyraminx in dedicated 3D interactive sandboxes.
  - One-click **"Solve this version"** button that instantly loads the selected puzzle directly into the main Puzzle Trainer.
  - Step-by-step written guides and algorithms for each puzzle.
- **"Learn Puzzles" Tab with Video Tutorials**:
  - Embedded high-definition YouTube video tutorials (by J Perm, WIRED, etc.) for 3x3, 2x2, 4x4, and Pyraminx.
  - Interactive chapter bookmark pills linking directly to specific video timestamps.
  - Complete written layer-by-layer guides with one-click "Try it on the cube" interactive algorithm execution.
- **Realistic 3D Pyraminx Speedcube Model**:
  - Regular tetrahedron geometry with signature speedcube black borders framing every triangular piece.
  - Solid dark inner core and individual piece backing frames with beveled skirts to eliminate color bleed.
  - Strict counter-clockwise outward face normals with high-gloss sticker planes.
- **Dedicated Prime & Custom Keybindings**:
  - Rebind any action directly (e.g. set physical key `D` to perform `R`).
  - Assign single dedicated keyboard keys for prime moves (`R'`, `U'`, `L'`, `D'`, `F'`, `B'`) without holding Shift.
  - Conflict resolution with toast alerts and quick unbinding via `Backspace` or `Delete`.
  - One-click presets: Standard layout or Two-Hand Pro Speedcubing layout.
- **Diagnostic Tips & Guidance**:
  - Contextual question mark (`?`) button opening a quick solving diagnostic to troubleshoot common beginner mistakes.

> [!NOTE]
> EiCube is built with vanilla DOM APIs for zero UI framework overhead, using Three.js as the sole runtime dependency.

---

## Architectural Deep Dive

### 1. Mathematical & Kinematic Model

EiCube decouples the logical permutation state of a puzzle from its 3D visual scene. All puzzle operations adhere to formal algebraic group definitions.

#### Camera View Resolution Matrix
To achieve perspective-relative rotations, the camera resolver (`src/cube/cameraResolver.ts`) computes the dot product between the camera's directional vector and the standard face normals:

$$\text{score}(F) = \vec{N}_F \cdot \vec{D}_{\text{camera}}$$

1. The camera orientation matrix is evaluated to derive forward, right, and up vectors in world space.
2. The front face is resolved by maximizing the dot product against the view vector.
3. The right and top faces are similarly projected onto the camera's orthogonal right and up vectors.
4. Physical moves (`U, D, L, R, F, B`) are dynamically mapped to canonical puzzle axes, ensuring that pressing **R** always turns the face appearing to the right of the screen.

#### Tetrahedron Geometry & Tessellation
The Pyraminx is modeled as a regular tetrahedron inscribed in Three.js Euclidean space:
- Edge length: $s = 2.4$
- Total pyramid height: $h = s \sqrt{\frac{2}{3}}$
- Inscribed base radius: $r = \frac{s \sqrt{3}}{6}$
- Circumscribed vertex radius: $R = \frac{s \sqrt{3}}{3}$

Each of the four faces is divided into 9 equilateral sub-triangles using barycentric coordinate interpolation:

$$P(u, v) = (1 - u - v)\vec{A} + u\vec{B} + v\vec{C}$$

Outward counter-clockwise winding is strictly enforced via cross-product validation against the face normal:

$$(\vec{P}_1 - \vec{P}_0) \times (\vec{P}_2 - \vec{P}_0) \cdot \vec{N}_{\text{face}} > 0$$

To achieve authentic speedcube aesthetics, each triangular piece consists of three distinct visual layers:
1. **Solid Inner Core**: A dark plastic tetrahedron at the center.
2. **Beveled Backing Plate**: Raised backing geometry with a $0.94$ shrink factor and beveled side skirts to create authentic mechanical seams.
3. **Glossy Sticker**: Inset with a $0.80$ shrink factor, yielding a $20\%$ bold black framing border around each colored facet.

---

### 2. Touch & Mouse Raycasting Architecture

Direct layer interaction requires discriminating between camera orbiting and layer turning without latency:

1. **Capture Phase Event Interception**:
   `pointerdown` listeners are attached with `{ capture: true }` directly on the WebGL canvas. When the pointer contacts a cubie mesh:
   - A raycaster computes the intersected cubie and face normal.
   - `OrbitControls.enabled` is immediately toggled to `false`.
   - The camera perspective remains completely locked during the solve.
2. **Tangent Vector Projection**:
   As the pointer moves, screen delta coordinates $(\Delta x, \Delta y)$ are projected onto the tangent planes of the intersected face:
   - The primary displacement axis determines the intended rotation layer.
   - The sign of the dot product determines clockwise versus counter-clockwise turn direction.
3. **Dynamic Cursor Feedback**:
   The canvas style switches dynamically between `grab` and `grabbing` to convey tactile state to the player.

---

### 3. Multi-Puzzle Engine & State Separation

The core logic is partitioned across pure TypeScript classes without dependencies on Three.js:

- **`CubeState.ts` (N-Dimensional Cube Engine)**:
  - Supports arbitrary cube dimensions ($N = 2, 3, 4$).
  - Internally tracks $6 \times N^2$ facelets as a flat typed array.
  - Physical layer rotations are represented as cyclic 4-cycle permutations of facelets and edge strips.
  - Exposes validation routines: `isSolved()`, `getFace(f)`, and `clone()`.
- **`pyraminxState.ts` (Tetrahedral Engine)**:
  - Tracks 36 triangular sticker positions across 4 faces: Green (0), Red (1), Blue (2), and Yellow (3).
  - Handles independent corner tip rotations (`u, l, r, b`) and dual-layer axial rotations (`U, L, R, B`).
  - Implements standard WCA scrambler generating canonical 14-move random sequences.
- **Universal Inter-Tab Puzzle Bridge**:
  - The "Other Puzzles" explorer tab and the main "Puzzle" trainer share state via the `loadPuzzle(size, type)` dispatcher.
  - Clicking **"Solve this version"** on any puzzle card instantly switches active tabs, instantiates the corresponding 3D scene, and binds the appropriate control pad.

---

### 4. Audio/Visual & UI Philosophy

- **Zero-Dependency Vanilla DOM**:
  All UI components (tab switcher, navigation bars, modal dialogs, move history list, settings sheet) are implemented using lightweight vanilla TypeScript and standard DOM manipulation. This maintains high rendering performance and zero runtime framework baggage.
- **Responsive Drawer Architecture**:
  On viewports below 900px width:
  - Controls and history collapse into off-canvas side drawers.
  - A fixed floating thumb dock provides single-tap access to primary actions.
  - Semi-transparent backdrop overlays enable tap-to-dismiss behavior.
- **Embedded Tutorial Scraper & Timestamp Links**:
  The "Learn Puzzles" tab embeds official YouTube guides with interactive chapter bookmark pills. Clicking a chapter pill injects the exact start time parameter (`?start=SS`) into the iframe embed, letting users jump to specific algorithms without leaving the trainer.

---

## Project Directory Structure

```
src/
├── cube/
│   ├── types.ts            # Type definitions, face normals, Pyraminx color constants
│   ├── CubeState.ts        # Pure logical representation supporting arbitrary cube sizes (2x2, 3x3, 4x4)
│   ├── pyraminxState.ts    # Pure logical representation, moves, and scramble for Pyraminx
│   ├── moves.ts            # Physical layer and axis rotation mappings
│   ├── notation.ts         # Parser for notation strings, multipliers, and inversions
│   ├── scramble.ts         # Random scramble and inverse sequence generator
│   └── cameraResolver.ts   # Vector math for resolving camera view to cube faces
├── render/
│   ├── RubiksCubeScene.ts  # Three.js cube scene, raycasting, touch drag, dynamic sizes
│   ├── PyraminxScene.ts    # Three.js regular tetrahedron puzzle renderer with speedcube borders
│   └── AnimationQueue.ts   # Eased animation queue with dynamic speed scaling
├── content/
│   ├── guideData.ts        # 3x3 beginner method, notation guide, and CFOP data
│   ├── otherCubesData.ts   # Structured guides and algorithms for 3x3, 2x2, 4x4, and Pyraminx
│   └── videoData.ts        # Curated YouTube video tutorials with metadata and chapter timestamps
├── ui/
│   ├── tabs.ts             # 3-way tab manager (Puzzle, Other Puzzles, Learn Puzzles)
│   ├── controls.ts         # Top floating bar with mini picker, left keybind pad, right history, mobile dock
│   ├── settings.ts         # Keybind rebinding modal, direct prime binds, presets
│   ├── tutorial.ts         # Multi-step onboarding overlay
│   ├── tipsModal.ts        # Solving diagnostic and quick tips modal
│   ├── otherCubes.ts       # Other Puzzles manager with "Solve this version" button
│   ├── guideRenderer.ts    # Learn Puzzles guide with embedded YouTube video players
│   └── toast.ts            # Notification and toast alert manager
├── tests/
│   └── cube.test.ts        # Vitest suite covering all puzzles, algorithms, keybinds, and videos
├── main.ts                 # Application entry point and tab orchestration
└── style.css               # Clean dark-mode stylesheet, responsive dock, and drawer transitions
```

---

## Verification & Test Suite

EiCube includes an automated unit test suite executed via Vitest. The test suite guarantees:

1. **State Preservation**: 4-cycle identity checks ensuring $X^4 = I$ and $X \cdot X' = I$ for all cube moves.
2. **Camera Resolver Accuracy**: Deterministic mapping of canonical camera orientations to expected face assignments.
3. **Notation Parser**: Robust tokenization of standard notation, double turns (e.g. `U2`), slice moves (`M, E, S`), and prime variants.
4. **Pyraminx Permutations**: Verification of tip rotations, center facelet swaps, and scramble validity.
5. **Data Integrity**: Schema validation across all embedded tutorial guides and YouTube timestamp chapters.

Run tests locally:

```bash
npm test
```

---

## Local Development

### Prerequisites

- Node.js (version 18 or newer)
- npm (version 9 or newer)

### Installation

```bash
git clone https://github.com/eitophetamine9/EiCube.git
cd EiCube
npm install
```

### Start Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Run Unit Tests

```bash
npm test
```

### Production Build

```bash
npm run build
```

Compiled static production assets are output to the `dist/` directory.

---

## License

MIT License. Open source and free for personal and educational use.
