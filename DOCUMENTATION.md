# EiCube Technical Documentation & Architecture Breakdown

This document provides a comprehensive technical breakdown of EiCube's architectural design, mathematical models, raycasting mechanics, state separation, and test verification.

For general setup and an overview of the application, refer to the [README.md](README.md).

---

## Table of Contents

- [1. System Architecture & File Structure](#1-system-architecture--file-structure)
- [2. Mathematical & Kinematic Model](#2-mathematical--kinematic-model)
  - [Camera View Resolution Matrix](#camera-view-resolution-matrix)
  - [Regular Tetrahedron Geometry & Tessellation](#regular-tetrahedron-geometry--tessellation)
  - [Piece Backing Plates & Aesthetic Bordering](#piece-backing-plates--aesthetic-bordering)
- [3. Touch & Mouse Raycasting Architecture](#3-touch--mouse-raycasting-architecture)
  - [Capture-Phase Event Interception](#capture-phase-event-interception)
  - [Camera Perspective Freezing](#camera-perspective-freezing)
  - [Tangent Plane Vector Projection](#tangent-plane-vector-projection)
  - [Dynamic Cursor Feedback](#dynamic-cursor-feedback)
- [4. Multi-Puzzle State Representation](#4-multi-puzzle-state-representation)
  - [N-Dimensional Cube Engine (`CubeState.ts`)](#n-dimensional-cube-engine-cubestatets)
  - [Tetrahedral Engine (`pyraminxState.ts`)](#tetrahedral-engine-pyraminxstatets)
  - [Cross-Tab Puzzle Dispatcher](#cross-tab-puzzle-dispatcher)
- [5. UI Philosophy & Ergonomics](#5-ui-philosophy--ergonomics)
  - [Zero-Dependency Vanilla DOM Architecture](#zero-dependency-vanilla-dom-architecture)
  - [Mobile Thumb Dock & Off-Canvas Drawers](#mobile-thumb-dock--off-canvas-drawers)
  - [Embedded Video Guides & Timestamp Scraping](#embedded-video-guides--timestamp-scraping)
- [6. Testing & Quality Assurance](#6-testing--quality-assurance)

---

## 1. System Architecture & File Structure

EiCube is structured with strict separation between pure logic, 3D rendering scenes, UI components, and static educational content:

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
└── style.css               # Daylight Cubing Studio design system, responsive dock, and drawer transitions
```

---

## 2. Mathematical & Kinematic Model

### Camera View Resolution Matrix

In traditional 3D cube implementations, pressing the `R` key rotates the positive X face regardless of the camera's angle. EiCube implements dynamic perspective mapping:

$$\text{score}(F) = \vec{N}_F \cdot \vec{D}_{\text{camera}}$$

The algorithm executes on every user input:
1. Deconstructs the camera world matrix to derive right ($\vec{R}$), up ($\vec{U}$), and direction ($\vec{D}$) unit vectors.
2. Evaluates the dot product between each canonical face normal ($\vec{N}_F \in \{\pm\hat{x}, \pm\hat{y}, \pm\hat{z}\}$) and the camera vectors.
3. Maps viewer-relative moves:
   - **Front (F)**: Face maximizing $\vec{N}_F \cdot (-\vec{D})$.
   - **Back (B)**: Face maximizing $\vec{N}_F \cdot \vec{D}$.
   - **Right (R)**: Face maximizing $\vec{N}_F \cdot \vec{R}$.
   - **Left (L)**: Face maximizing $\vec{N}_F \cdot (-\vec{R})$.
   - **Up (U)**: Face maximizing $\vec{N}_F \cdot \vec{U}$.
   - **Down (D)**: Face maximizing $\vec{N}_F \cdot (-\vec{U})$.

> [!IMPORTANT]
> Because rotation mappings recalculate on the fly, rotating the viewport 180 degrees causes the physical Right face to act on the piece currently appearing on the right side of the monitor, preserving intuitive muscle memory.

### Regular Tetrahedron Geometry & Tessellation

The Pyraminx is modeled as a regular tetrahedron centered at the Euclidean origin $(0, 0, 0)$:

$$\text{Edge length } s = 2.4, \quad h = s\sqrt{\frac{2}{3}}, \quad r = \frac{s\sqrt{3}}{6}, \quad R = \frac{s\sqrt{3}}{3}$$

Vertices:
- **Top Vertex**: $V_{\text{top}} = (0, \frac{3h}{4}, 0)$
- **Front-Left Vertex**: $V_{\text{FL}} = (-\frac{s}{2}, -\frac{h}{4}, r)$
- **Front-Right Vertex**: $V_{\text{FR}} = (\frac{s}{2}, -\frac{h}{4}, r)$
- **Back Vertex**: $V_{\text{Back}} = (0, -\frac{h}{4}, -R)$

Each triangular face is subdivided into 9 sub-triangles using normalized barycentric coordinates:

$$P(u, v) = (1 - u - v)\vec{A} + u\vec{B} + v\vec{C}$$

Counter-clockwise outward vertex winding is enforced by validating normal alignment:

$$(\vec{P}_1 - \vec{P}_0) \times (\vec{P}_2 - \vec{P}_0) \cdot \vec{N}_{\text{face}} > 0$$

### Piece Backing Plates & Aesthetic Bordering

To eliminate translucent color bleed-through and mirror the appearance of high-end competition speedcubes, each piece consists of three distinct visual components:
1. **Solid Inner Core**: A dark plastic regular tetrahedron ($0x111317$, roughness $0.35$).
2. **Beveled Backing Plate**: Individual 3D piece frames raised $0.016$ units above the core with a $0.94$ shrink factor and beveled side walls.
3. **Elevated Glossy Sticker**: Colored triangular facets raised $0.024$ units above the core with a $0.80$ shrink factor, producing the signature $20\%$ dark speedcube framing border.

---

## 3. Touch & Mouse Raycasting Architecture

### Capture-Phase Event Interception

To avoid latency and eliminate conflicts between Three.js `OrbitControls` and direct puzzle layer manipulation, pointer events are captured during the DOM event capture phase:

```typescript
canvas.addEventListener('pointerdown', this.onPointerDown.bind(this), { capture: true });
```

### Camera Perspective Freezing & Unconstrained Trackball Inspection

When a `pointerdown` event registers:
1. A raycaster evaluates intersections against cubie meshes.
2. If a cubie is intersected, `TrackballControls.enabled` is immediately set to `false`.
3. The camera position remains fixed throughout the drag, ensuring the viewport perspective never rotates while executing a turn.
4. If no cubie is intersected (clicking the background stage), `TrackballControls` remains enabled to allow smooth 360-degree viewpoint inspection.
5. Unlike standard OrbitControls with polar angle clamping ($[0, \pi]$), EiCube's inspection engine uses unconstrained virtual trackball quaternion rotations. This completely eliminates gimbal locking, singularity traps, and top/bottom polar stalling, enabling users to freely roll, flip, and tumble the puzzle across all angles.

### Dynamic Device Responsive Scaling

To prevent puzzles from clipping or appearing overly zoomed-in on mobile portrait viewports (narrow aspect ratios $A < 1.0$), camera distances are calculated dynamically based on viewport aspect ratio:

$$D = \frac{R_{\text{bound}}}{\min(1, A / 0.95) \cdot \tan(\text{fov}_v / 2)} \cdot M$$

where $R_{\text{bound}}$ is the 3D bounding radius of the puzzle, $\text{fov}_v$ is the vertical field of view ($42^\circ$), and $M$ is the platform margin factor ($1.40$ on mobile, $1.24$ on desktop). This ensures consistent edge clearance on all devices without manual zoom adjustments.

### Tangent Plane Vector Projection

When dragging on a cubie, the 2D pointer delta $(\Delta x, \Delta y)$ is mapped onto the 3D tangent vectors of the touched face:
- The dominant projection axis determines the rotation layer.
- The sign of the scalar projection determines clockwise versus counter-clockwise rotation.
- Releasing the pointer snaps the rotation to the nearest 90-degree increment using quaternion slerp.

### Dynamic Cursor Feedback

- **`grab`**: Default cursor displayed when hovering over puzzle pieces or an idle viewport.
- **`grabbing`**: Active cursor engaged immediately upon dragging a layer or orbiting the camera.

---

## 4. Multi-Puzzle State Representation

### N-Dimensional Cube Engine (`CubeState.ts`)

The logical cube engine supports arbitrary cube dimensions ($N = 2, 3, 4$) through pure permutation matrices:
- Tracks $6 \times N^2$ facelets stored as a flat array.
- Layer turns rotate the targeted facelet matrix and cyclically shift the corresponding slice strips across adjacent faces.
- Exposes pure utility functions:
  - `isSolved()`: Checks if all facelets on each face match the face center.
  - `applyMove(notation)`: Applies single or compound algorithm steps.
  - `clone()`: Creates deep clones for search or solver simulation.

### Tetrahedral Engine (`pyraminxState.ts` & `PyraminxScene.ts`)

Tracks 36 triangular sticker positions across 4 faces (Green, Red, Blue, Yellow):
- **Tip Rotations**: `u, l, r, b` (single-piece corner rotations around vertex axes by $\pm 120^\circ$).
- **Axial Layer Rotations**: `U, L, R, B` (double-layer rotations affecting corner tips, centers, and edge pieces).
- **Dynamic 3D Layer Animation**: Eased cubic interpolation rotating affected piece groups around normalized tetrahedral vertex axes ($\vec{A}_U, \vec{A}_L, \vec{A}_R, \vec{A}_B$) attached to a dynamic pivot group.
- **Direct Touch & Mouse Layer Drag**: Direct swipe interaction on any piece with automatic screen tangent projection, camera perspective freezing on contact, and dynamic hand cursor (`grab` / `grabbing`).
- **Scramble Generator**: Produces 14-move scrambles compliant with World Cube Association (WCA) regulations with high-speed animation.

### Cross-Tab Puzzle Dispatcher

The application maintains synchrony between the "Other Puzzles" sandbox explorer and the main "Puzzle" trainer:
- Clicking **"Solve this version"** invokes `loadPuzzle(size, type)` on the root tab manager.
- Disposes of existing WebGL resources, switches the active view tab, instantiates the target Three.js scene, and dynamically adjusts the on-screen move pad.

---

## 5. UI Philosophy & Ergonomics

### Zero-Dependency Vanilla DOM Architecture

EiCube contains zero UI frameworks (no React, Vue, Svelte, or Tailwind). All UI components are built with standard DOM APIs:
- High frame rates (60fps) on desktop and mobile devices.
- Lightweight bundle footprint without virtual DOM overhead.
- Direct synchronization between Three.js render loops and DOM state.

### Mobile Thumb Dock & Off-Canvas Drawers

On viewports below 900px width:
- A fixed floating thumb dock provides one-tap access to Moves, Scramble, Undo, and History.
- Sidebars collapse into off-canvas drawers equipped with semi-transparent backdrops (`#mobile-drawer-backdrop`) for tap-to-close behavior.
- Multi-touch pinch-to-zoom is supported natively.

### Embedded Video Guides & Timestamp Scraping

The "Learn Puzzles" tab integrates curated YouTube video tutorials:
- Embedded players using `youtube-nocookie.com`.
- Interactive chapter bookmark pills that dynamically set the iframe playback timestamp via URL query parameters (`?start=SS`).
- Direct integration between algorithm cards and the 3D scene via "Try it on the cube" buttons.

### Advanced Speedcubing Section & Pro Algorithm Library

EiCube features an Advanced Speedcubing section covering all four puzzles:
- **3x3 CFOP (Fridrich)**: Full PLL cases (T-Perm, Y-Perm, Jb-Perm, H-Perm, Z-Perm, Ua-Perm, Ub-Perm), essential OLL cases (Sune, Anti-Sune), and fingertrick triggers (Sexy Move, Sledgehammer). Accompanied by J Perm's 21 PLL Algorithms tutorial (`vU6HsK3hvQs`).
- **2x2 Ortega & CLL**: Complete PBL (Permute Both Layers) case coverage (Adjacent/Adjacent, Diagonal/Diagonal, Adjacent/None, Diagonal/None, None/Adjacent) and OLL cases with J Perm's sub-4 speedcubing guide (`z2gOUzMmY3w`).
- **4x4 Yau Parity**: OLL Parity (`Rw U2 x Rw U2...`), PLL Parity (`2R2 U2 2R2 Uw2 2R2 2Uw2`), and 3-2-2-2 edge flipping triggers with J Perm's Parity & Fingertricks guide (`6P_tJ1_Z8v8`).
- **Pyraminx L4E**: Last 4 Edges intuitive speedsolving, Sledgehammer and Hedgeslammer triggers, clockwise/counter-clockwise 3-edge cycles, and double-edge flips with SpeedyGoneCuber's L4E speedcubing guide (`_S2iDihTuxw`).
- **1-Click 3D Execution**: Every algorithm card includes an interactive "Try on puzzle" button that immediately loads the puzzle into the trainer and executes the algorithm with real-time 3D animation.

### Conventional Move Bindings & Middle Slices (M / M')

- **Middle Slices**: Middle slice turns (`M`, `M'`, `E`, `E'`, `S`, `S'`) are fully supported by the kinematic solver (`resolveTurn()`), rotating layer coordinate 0 with WCA standard rotational vectors.
- **Wide Turns**: Two-layer turns (`Rw`, `Rw'`, `Lw`, `Lw'`, `Uw`, `Uw'`, `Dw`, `Dw'`, `Fw`, `Fw'`, `Bw`, `Bw'`) calculate outer and inner adjacent coordinates dynamically across arbitrary puzzle dimensions.
- **Pyraminx Tips**: Independent vertex tips (`u`, `u'`, `l`, `l'`, `r`, `r'`, `b`, `b'`) can be executed and rebound to dedicated keys without requiring Shift.
- **Direct 1-Click Keytag Rebind**: Every move in the sidebar move pad features a clickable key tag (`data-rebind-action`) that opens the rebind modal directly focused on that move.

### Dynamic Website Navigation Spotlight

The onboarding tutorial (`TutorialOverlay`) guides new users through website navigation using visual spotlighting:
- Dynamically attaches an animated glowing outline (`.tutorial-spotlight-active`) to target DOM elements across 4 concise steps (3D Stage, Puzzle Switcher, Move Pad & Keybinds, Learn & Speedcubing).
- Designed for speed: limited to single punchy sentences to prevent user fatigue or skips.
- Full keyboard support (`ArrowRight`, `ArrowLeft`, `Enter`, `Escape`) and clickable step indicators.

---

## 6. Testing & Quality Assurance

EiCube includes an automated Vitest unit test suite with 18 tests (`src/tests/cube.test.ts`):

1. **Move Identity Inverses**: Verifies that applying $X$ followed by $X'$ returns the cube to an identity state ($X \cdot X' = I$).
2. **Cycle Periodicity**: Verifies that repeating any face turn 4 times leaves the state unchanged ($X^4 = I$).
3. **Axis Rotations & Slice Verification**: Validates 4-fold periodic return for whole-cube rotations ($x, y, z$), 2-fold return for double rotations ($x2, y2, z2$), slice turns ($M, E, S$), and wide turns ($Rw, Lw, Uw, Dw, Fw, Bw$) across 2x2, 3x3, and 4x4.
4. **Camera Resolver Determinism**: Validates face resolution across 0, 90, 180, and 270 degree camera yaw angles.
5. **Pyraminx Permutations**: Validates tip rotations, axial layer turns, and scramble validity.
6. **Notation Parser**: Verifies parsing of single moves, prime modifiers (`'`), double turns (`2`), and algorithm repetitions (`(R U R' U') x2`).
7. **Data Schema Integrity**: Validates video IDs, start timestamps, and algorithm strings in content dictionaries.

Execute the test suite:

```bash
npm test
```
