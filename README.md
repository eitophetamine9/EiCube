<h1 align="center">EiCube</h1>

<p align="center">
  <a href="https://github.com/eitophetamine9/EiCube/releases/tag/v1.0.3"><img src="https://img.shields.io/badge/Release-v1.0.3-3f6212?style=flat&logo=github&logoColor=white" alt="Release v1.0.3" /></a>
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

Unlike conventional digital cube simulators that lock rotations to static world axes, EiCube features a dynamic camera-relative rotation resolver and an unconstrained trackball inspection system that allows continuous, 360-degree rotation across all angles with zero POV locking. Every move executed by the player is resolved relative to their current viewport perspective.

> [!IMPORTANT]
> **Camera-Relative Kinematics & Free Trackball Inspection**: Turning the **R** face always turns whichever face is currently positioned on the viewer's right side, regardless of camera orbit angle. The camera utilizes unconstrained spherical quaternion rotation, allowing full tumbling, upside-down inspection, and zero polar lock.

---

## Quick Links

- **Live Production App**: [https://eicube.vercel.app](https://eicube.vercel.app)
- **Technical Documentation**: [DOCUMENTATION.md](DOCUMENTATION.md)
- **GitHub Release**: [Release v1.0.3](https://github.com/eitophetamine9/EiCube/releases/tag/v1.0.3)
- **Source Repository**: [https://github.com/eitophetamine9/EiCube](https://github.com/eitophetamine9/EiCube)

---

## Key Features

- **No-Login Editorial Landing Page (`v1.0.3`)**: Instant landing hub with a live interactive 3D showcase cube stage, architecture highlights, and one-click puzzle launch cards directly into `3x3`, `2x2`, `4x4`, or `Pyraminx`.
- **Full-Sphere X / Y / Z Arcball Rotation & Drag Sensitivity (`v1.0.3`)**: Quaternion virtual sphere + hyperbolic roll engine (`SphereArcballControls`) lets you pitch, yaw, and twist smoothly across all 3 spatial axes with exponential momentum inertia and configurable Drag Sensitivity (`0.5x`–`5.0x`).
- **Matrix Binary Dark & Daylight Studio Themes (`v1.0.3`)**: Deepened pine-emerald Dark Mode (`#040a06`) paired with a dual-theme animated `0`/`1` Matrix rain `<canvas>` backdrop correlated to the bright sage-sky Daylight theme (automatically static under `prefers-reduced-motion`).
- **WCA 15s Inspection & Persistent Ao5 / Ao12 Stats (`v1.0.3`)**: Competition 15-second countdown with 8s/12s Web Audio tones, `+2` and `DNF` penalty handling, and persistent session history calculating Personal Best, Session Mean, WCA trimmed Ao5, and Ao12.
- **OLL / PLL / PBL / Parity Algorithm Drills & Next-Move Hint (`v1.0.3`)**: Automatically invert and apply setup turns for speedcubing cases so you practice recognition and execution immediately, with optional step-by-step hints.
- **Custom 3D Color Schemes & WebBLE Smart Cube Sync (`v1.0.3`)**: Switch live between `Classic Black Bezel`, `Stickerless Bright`, and `High-Contrast Carbon` finishes across cubes and Pyraminx, or pair GAN / Giiker / Moyu Bluetooth cubes over GATT (with Virtual Smart Turn testing).
- **Dynamic Device Responsive Scaling**: Mathematical camera framing automatically scales distance and field-of-view based on device aspect ratio across desktop (`1440px`) and narrow phones (`320px`–`390px`).
- **All Legal Axis Rotations, Slices & 4x4 Inner Layers**: Complete support for whole-cube rotations (`x`, `x'`, `x2`, `y`, `y'`, `y2`, `z`, `z'`, `z2`), slice turns (`M`, `M'`, `M2`, `E`, `E'`, `E2`, `S`, `S'`, `S2`), 4x4 inner middle slices (`2R`, `2L`, `2U`, `2D`, `2F`, `2B`), and wide turns (`Rw`, `Lw`, `Uw`, `Dw`, `Fw`, `Bw`).
- **Beautified Moves Pad & Animated Move Glossary (`moves.html`)**: Clean category tabs paired with a **More Info** link to 64 custom looping 3D `.gif` animations and 1-click "Try in 3D" deep links.
- **Realistic Solid 3D Pyraminx Model**: Regular tetrahedron geometry with deep tapered opaque backing wedges (`DoubleSide`), zero see-through gaps, and direct mouse/touch drag interaction.

> [!NOTE]
> EiCube is built with vanilla DOM APIs for zero UI framework overhead, using Three.js as the sole runtime dependency.

---

## In-Depth Documentation

For detailed technical specifications, mathematical equations, raycasting logic, and architectural blueprints, read the project documentation:

- [DOCUMENTATION.md](DOCUMENTATION.md)
  - Mathematical & Kinematic Model (Camera dot products, tetrahedron Euclidean coordinates, barycentric tessellation)
  - Touch & Mouse Raycasting Architecture (Capture-phase interception, camera freezing, tangent projections)
  - Responsive Viewport & Sphere Arcball Kinematics (`SphereArcballControls.ts`, aspect-ratio dynamic fitting)
  - Multi-Puzzle Engine & State Separation (`CubeState.ts`, `pyraminxState.ts`)
  - UI Philosophy & Mobile Ergonomics
  - Testing & Verification Suite (22/22 Vitest unit tests)

---

## Project Structure

```
src/
├── cube/
│   ├── types.ts            # Type definitions, face normals, and 3D Color Scheme palettes
│   ├── CubeState.ts        # Pure logical representation supporting arbitrary cube sizes (2x2, 3x3, 4x4)
│   ├── pyraminxState.ts    # Pure logical representation, moves, and scramble for Pyraminx
│   ├── moves.ts            # Physical layer and axis rotation mappings
│   ├── notation.ts         # Parser for notation strings, multipliers, and inversions
│   ├── scramble.ts         # Random scramble and inverse sequence generator
│   ├── cameraResolver.ts   # Vector math for resolving camera view to cube faces
│   └── smartCube.ts        # WebBLE GATT smart cube client (GAN / Giiker / Moyu) + virtual tester
├── render/
│   ├── SphereArcballControls.ts # Full-sphere X/Y/Z quaternion arcball controls + momentum inertia
│   ├── RubiksCubeScene.ts  # Three.js cube scene, raycasting, touch drag, color scheme switching
│   ├── PyraminxScene.ts    # Three.js regular tetrahedron puzzle renderer with speedcube borders
│   └── AnimationQueue.ts   # Eased animation queue with dynamic speed scaling
├── content/
│   ├── guideData.ts        # 3x3 beginner method, notation guide, and CFOP data
│   ├── otherCubesData.ts   # Structured guides and algorithms for 3x3, 2x2, 4x4, and Pyraminx
│   ├── movesGlossaryData.ts # 64-move WCA & Pyraminx notation glossary with GIF paths
│   └── videoData.ts        # Curated YouTube video tutorials with metadata and chapter timestamps
├── ui/
│   ├── theme.ts            # Polar Light / Pine-Emerald Dark theme switcher with custom events
│   ├── matrixBackdrop.ts   # Dual-theme binary rain canvas backdrop respecting reduced motion
│   ├── tabs.ts             # 4-way tab manager (Home, Puzzle, Other Puzzles, Learn Puzzles)
│   ├── landing.ts          # Zero-login editorial landing page with live 3D Cube showcase
│   ├── controls.ts         # Top stacked controls, WCA 15s inspect, Drills, Hints, BLE, Moves Pad
│   ├── sessionStats.ts     # Persistent solve history, Ao5/Ao12 calculation, +2/DNF stats modal
│   ├── drillModal.ts       # Inverted OLL/PLL/PBL/Parity algorithm drill selector
│   ├── settings.ts         # Keybind rebinding modal, Drag Sensitivity, Color Scheme switcher
│   ├── tutorial.ts         # Multi-step onboarding overlay
│   ├── tipsModal.ts        # Solving diagnostic and quick tips modal
│   ├── otherCubes.ts       # Other Puzzles manager with "Solve this version" button
│   ├── guideRenderer.ts    # Learn Puzzles guide with embedded YouTube video players
│   └── toast.ts            # Notification and toast alert manager
├── tests/
│   └── cube.test.ts        # Vitest suite (22 tests: puzzles, arcball XYZ, Ao5/Ao12, schemes, drills)
├── main.ts                 # Application entry point, URL deep-link handler, and tab orchestration
├── movesPage.ts            # Dedicated animated Move Notation Glossary page controller
└── style.css               # Daylight & Pine-Emerald Matrix design system, responsive dock, and modals
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
