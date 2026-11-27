<h1 align="center">EiCube</h1>

<p align="center">
  <a href="https://github.com/eitophetamine9/EiCube/releases/tag/v1.0.4"><img src="https://img.shields.io/badge/Release-v1.0.4-3f6212?style=flat&logo=github&logoColor=white" alt="Release v1.0.4" /></a>
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
- **GitHub Release**: [Release v1.0.4](https://github.com/eitophetamine9/EiCube/releases/tag/v1.0.4)
- **Source Repository**: [https://github.com/eitophetamine9/EiCube](https://github.com/eitophetamine9/EiCube)

---

## Key Features

- **Speedcubing Turn Sound Effects & Volume Control (`v1.0.4`)**: Zero-latency Web Audio API sound synthesizer (`src/audio/soundEngine.ts`) with 3 tactile speedcube profiles (`Magnetic Snap`, `Crisp Clack`, `Soft Lubed`), `0%–100%` volume slider, preview button, and scramble-aware throttling across cubes and Pyraminx.
- **Two-Page Studio Settings (`General` & `Custom Keybinds`) (`v1.0.4`)**: Dedicated General tab housing icon-only **Sun / Moon** theme toggles, Turn SFX & Volume, 6 IRL Cube Color Themes with live 6-swatch previews, and Drag Sensitivity, cleanly separated from Custom Keybinds.
- **6 Real-Life (IRL) Cube Colorways (`v1.0.4`)**: Switch live between `Classic Black Bezel`, `Stickerless Bright`, `Primary Internals`, `Macaron Pastel`, `Carbon Contrast`, and `High-Contrast Night`.
- **Streamlined Navigation, `Choose Puzzle` Dropdown & Learn GIFs (`v1.0.4`)**: 3-tab navigation (`Home | Puzzle | Learn Puzzles`), a clean `Choose Puzzle` dropdown menu in the Puzzle trainer, inline looping `.gif` turn animations inside `Learn Puzzles`, and an **EiCube — 3D cubing in browser.** landing hero.
- **Full-Sphere X / Y / Z Arcball Rotation & Drag Sensitivity**: Quaternion virtual sphere + hyperbolic roll engine (`SphereArcballControls`) lets you pitch, yaw, and twist smoothly across all 3 spatial axes with exponential momentum inertia and configurable Drag Sensitivity (`0.5x`–`5.0x`).
- **Matrix Binary Dark & Daylight Studio Themes**: Deepened pine-emerald Dark Mode (`#040a06`) paired with a dual-theme animated `0`/`1` Matrix rain `<canvas>` backdrop correlated to the bright sage-sky Daylight theme (automatically static under `prefers-reduced-motion`).
- **WCA 15s Inspection & Persistent Ao5 / Ao12 Stats**: Competition 15-second countdown with 8s/12s Web Audio tones, `+2` and `DNF` penalty handling, and persistent session history calculating Personal Best, Session Mean, WCA trimmed Ao5, and Ao12.
- **OLL / PLL / PBL / Parity Algorithm Drills & WebBLE Smart Cube Sync**: Auto-inverted drill setups with Next-Move Hints and Web Bluetooth GATT adapter for GAN / Giiker / Moyu smart cubes.

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
├── audio/
│   └── soundEngine.ts      # Web Audio turn SFX synthesizer (3 speedcube profiles + volume)
├── cube/
│   ├── types.ts            # Type definitions, face normals, and 6 IRL Color Scheme palettes
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
│   ├── tabs.ts             # 3-way tab manager (Home, Puzzle, Learn Puzzles)
│   ├── landing.ts          # Zero-login editorial landing page (EiCube — 3D cubing in browser)
│   ├── controls.ts         # Single-row trainer topbar, Choose Puzzle dropdown, Tools drawer, Moves Pad
│   ├── sessionStats.ts     # Persistent solve history, Ao5/Ao12 calculation, +2/DNF stats modal
│   ├── drillModal.ts       # Inverted OLL/PLL/PBL/Parity algorithm drill selector
│   ├── settings.ts         # Two-page Settings modal (General w/ Sun/Moon, SFX, Colors | Custom Keybinds)
│   ├── tutorial.ts         # Multi-step onboarding overlay
│   ├── tipsModal.ts        # Solving diagnostic and quick tips modal
│   ├── guideRenderer.ts    # Learn Puzzles guide with embedded videos and inline looping move GIFs
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
