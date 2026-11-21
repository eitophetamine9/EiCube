<h1 align="center">EiCube</h1>

<p align="center">
  <a href="https://github.com/eitophetamine9/EiCube/releases/tag/v1.0.0"><img src="https://img.shields.io/badge/Release-v1.0.0-007acc?style=flat&logo=github&logoColor=white" alt="Release v1.0.0" /></a>
  <a href="https://eicube.vercel.app"><img src="https://img.shields.io/badge/Deployment-Vercel-black?style=flat&logo=vercel&logoColor=white" alt="Live Deployment" /></a>
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

## Quick Links

- **Live Production App**: [https://eicube.vercel.app](https://eicube.vercel.app)
- **Technical Documentation**: [DOCUMENTATION.md](DOCUMENTATION.md)
- **GitHub Release**: [Release v1.0.0](https://github.com/eitophetamine9/EiCube/releases/tag/v1.0.0)
- **Source Repository**: [https://github.com/eitophetamine9/EiCube](https://github.com/eitophetamine9/EiCube)

---

## Key Features

- **Direct Mouse & Touch Layer Drag**: Swipe any cubie along a face tangent to rotate that layer, with dynamic camera locking and tactile hand cursor feedback (`grab` / `grabbing`).
- **Camera-Relative Controls**: Physical keybinds and on-screen pads dynamically map to faces relative to your current camera view angle.
- **Player-Centric Move History**: Scramble turns are cleanly filtered out; timer automatically starts on the player's first manual turn.
- **Multi-Puzzle Support**: Universal trainer for 3x3x3, 2x2x2, 4x4x4, and regular tetrahedron Pyraminx.
- **"Solve This Version"**: Explore puzzles in dedicated 3D interactive sandboxes and load them directly into the solver with one click.
- **Realistic 3D Pyraminx Model**: Regular tetrahedron geometry with signature 20% speedcube black borders, dynamic 3D layer turning animation, and direct mouse/touch swipe interaction.
- **Embedded Video Guides**: Curated YouTube tutorials with interactive chapter bookmark pills linking to specific algorithm timestamps.
- **Mobile Ergonomics**: Floating thumb dock with quick access to Moves, Scramble, Undo, and History, plus responsive off-canvas drawers.
- **Custom Keybindings**: Fully rebindable keys with dedicated single-key prime moves (`R'`, `U'`, `L'`, `D'`, `F'`, `B'`) and speedcubing presets.

> [!NOTE]
> EiCube is built with vanilla DOM APIs for zero UI framework overhead, using Three.js as the sole runtime dependency.

---

## In-Depth Documentation

For detailed technical specifications, mathematical equations, raycasting logic, and architectural blueprints, read the project documentation:

- [DOCUMENTATION.md](DOCUMENTATION.md)
  - Mathematical & Kinematic Model (Camera dot products, tetrahedron Euclidean coordinates, barycentric tessellation)
  - Touch & Mouse Raycasting Architecture (Capture-phase interception, camera freezing, tangent projections)
  - Multi-Puzzle Engine & State Separation (`CubeState.ts`, `pyraminxState.ts`)
  - UI Philosophy & Mobile Ergonomics
  - Testing & Verification Suite (16/16 Vitest unit tests)

---

## Project Structure

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

### Development Server

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

Compiled static production assets are generated in the `dist/` directory.

---

## License

MIT License. Open source and free for personal and educational use.
