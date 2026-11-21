# EiCube

## Overview

EiCube is an interactive 3D twisty puzzle trainer and comprehensive solving guide built with Three.js, TypeScript, and Vite. It provides a digital training environment for both beginner and competitive speedcubers. Unlike traditional digital cubes that enforce fixed global world axes, EiCube dynamically resolves all moves relative to your current camera viewpoint.

> [!IMPORTANT]
> **Camera-Relative Rotations**: Turning the **R** face always turns whichever face is currently positioned on the viewer's right side, regardless of camera orbit angle. If you rotate the view 180 degrees, pressing R acts on the face now on your right, preserving intuitive tactile execution.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vite.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest&logoColor=white)](https://vitest.dev/)
[![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=flat&logo=youtube&logoColor=white)](https://www.youtube.com/)

---

## Key Features

- **Mouse & Touch Direct Layer Drag**:
  - Direct 3D swipe controls: touch or click any cubie and drag along a face tangent to immediately execute that layer rotation.
  - Automatic differentiation: swiping on a cubie rotates that layer, while dragging the background smoothly orbits the camera.
  - Multi-touch pinch-to-zoom support for mobile devices.
- **Player-Centric Move History**:
  - Scramble moves are cleanly excluded from the move history log.
  - Move history strictly records turns manually executed by the player (via keys, on-screen buttons, or direct touch drags).
  - Stopwatch timer starts automatically on the player's first manual move after a scramble.
- **Mobile-Friendly Ergonomics**:
  - Fixed floating thumb dock on mobile devices with quick access to Moves, Scramble, Undo, and History.
  - Slide-out drawer sidebars for keybinds and move history with tap-to-close backdrops.
  - Full-screen unobstructed 3D stage on phones and tablets.
- **Universal "Puzzle" Trainer Tab**:
  - Dynamically load and solve any puzzle: 3x3 Rubik's Cube, 2x2 Pocket Cube, 4x4 Rubik's Revenge, or Pyraminx.
  - Seamless inline quick-picker in the top floating bar.
  - Dedicated move pads adapting automatically for cube layers or Pyraminx faces and tips.
  - Solved state detection, stopwatch timer (`00:00.00`), scramble, reset, undo, and speed slider.
- **"Other Puzzles" Tab with "Solve this version"**:
  - Explore 3x3, 2x2, 4x4, and Pyraminx in dedicated 3D interactive sandboxes.
  - One-click **"Solve this version"** button that instantly loads the selected puzzle directly into the main Puzzle Trainer.
  - Step-by-step written guides and algorithms for each puzzle.
- **"Learn Puzzles" Tab with Video Tutorials**:
  - Embedded high-definition YouTube video tutorials (by J Perm, WIRED, etc.) for 3x3, 2x2, 4x4, and Pyraminx.
  - Interactive chapter bookmark pills linking directly to specific video timestamps.
  - Complete written layer-by-layer guides with one-click "Try it on the cube" interactive algorithm execution.
- **Realistic 3D Pyraminx Speedcube Model**:
  - Regular tetrahedron with signature speedcube black border framing every triangular piece.
  - Solid dark inner core and individual piece backing frames preventing color bleed.
  - Strict counter-clockwise outward face normals with high-gloss sticker planes.
- **Ergonomic Studio Layout**:
  - **Left Sidebar**: Move controls with inline keybinding display and click-to-rebind capability.
  - **Right Sidebar**: Vertical move history log with step numbers and auto-scrolling.
  - **Center Viewport**: Unobstructed 3D stage with orbit and zoom controls.
- **Dedicated Prime & Custom Keybindings**:
  - Rebind any action directly (e.g. set physical key `D` to perform `R`).
  - Assign single dedicated keyboard keys for prime moves (`R'`, `U'`, `L'`, `D'`, `F'`, `B'`) without holding Shift.
  - One-click presets: Standard layout or Two-Hand Pro Speedcubing layout.
- **Diagnostic Tips & Guidance**:
  - Contextual question mark (`?`) button opening a quick solving diagnostic to troubleshoot common beginner mistakes.

> [!NOTE]
> The app is built with vanilla DOM APIs for zero UI framework bloat, using Three.js as the sole runtime dependency.

---

## Architecture

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
│   ├── RubiksCubeScene.ts  # Three.js scene, lighting, materials, dynamic size switching
│   ├── PyraminxScene.ts    # Three.js regular tetrahedron puzzle renderer with speedcube black borders
│   └── AnimationQueue.ts   # Eased animation queue with dynamic speed scaling
├── content/
│   ├── guideData.ts        # 3x3 beginner method, notation guide, and CFOP data
│   ├── otherCubesData.ts   # Structured guides and algorithms for 3x3, 2x2, 4x4, and Pyraminx
│   └── videoData.ts        # Curated YouTube video tutorials with metadata and chapter timestamps
├── ui/
│   ├── tabs.ts             # 3-way tab manager (Puzzle, Other Puzzles, Learn Puzzles)
│   ├── controls.ts         # Top floating bar with mini picker, left keybind pad, right history
│   ├── settings.ts         # Keybind rebinding modal, direct prime binds, presets
│   ├── tutorial.ts         # Multi-step onboarding overlay
│   ├── tipsModal.ts        # Solving diagnostic and quick tips modal
│   ├── otherCubes.ts       # Other Puzzles manager with "Solve this version" button
│   ├── guideRenderer.ts    # Learn Puzzles guide with embedded YouTube video players
│   └── toast.ts            # Notification manager
├── tests/
│   └── cube.test.ts        # Vitest suite covering all puzzles, algorithms, keybinds, and videos
├── main.ts                 # Application entry point
└── style.css               # Styling, smooth transitions, video cards, and responsive layout
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

The compiled static assets are generated in the `dist/` directory.

---

## License

MIT License. Open source and free for personal and educational use.
