<h1 align="center">EiCube</h1>

<p align="center">
  <a href="https://github.com/eitophetamine9/EiCube/releases/tag/v1.0.5"><img src="https://img.shields.io/badge/Release-v1.0.5-3f6212?style=flat&logo=github&logoColor=white" alt="Release v1.0.5" /></a>
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
- **GitHub Release**: [Release v1.0.5](https://github.com/eitophetamine9/EiCube/releases/tag/v1.0.5)
- **Source Repository**: [https://github.com/eitophetamine9/EiCube](https://github.com/eitophetamine9/EiCube)

---

## What's New in Current Version?

> [!NOTE]
> **v1.0.5** introduces the **Help with Cube** physical 3x3 scanner & visual solver tab (6-side photo upload + consent-gated live webcam auto-scanner, editable 2D net with parity diagnostics, 3D playback, collapsible solving guide dropdown, and per-move `.gif` animations), plus updates **Macaron Pastel** (`pastel`) to use the sleek High-Contrast Night colorway.

- **New `Help with Cube` Tab (`v1.0.5`)**: Capture all 6 faces of your real physical 3x3 cube via **Upload 6 Sides** or the **consent-gated Live Webcam Scanner** (with hands-free **Auto-Scan**, center-sticker CIE Lab color calibration, and optional **Step Auto-Advance**). Includes an interactive tap-to-fix 2D net with exact parity/count diagnostics, **Load Sample Cube** / **Use Current 3x3**, and a speedcubing latency disclaimer linking to **Bluetooth Smart Cubes** on the Puzzle page.
- **3D Solver, Collapsible Solving Guide & Move GIFs (`v1.0.5`)**: Renders your scanned 3x3 in an interactive Three.js viewport with `0.5x`/`1x`/`2x` playback controls, a hideable **Solving Guide & Move GIFs** dropdown organized across Steps 1–7, looping `./gifs/moves/*.gif` spotlights for every move, **Copy Moves**, and **Open in 3x3 Trainer**.
- **Refreshed `Macaron Pastel` Theme (`v1.0.5`)**: Replaced the original pastel finish with the high-contrast dark-bezel **High-Contrast Night** palette and automatically migrates saved `'contrast'` preferences cleanly.

---

## Core Features

- **Multi-Puzzle 3D Studio (`3x3`, `2x2`, `4x4`, `Pyraminx`)**: Interactive Three.js trainer with camera-relative kinematics, unconstrained X/Y/Z `SphereArcballControls` inspection, configurable drag sensitivity (`0.5x`–`5.0x`), and a single `Choose Puzzle` dropdown.
- **Physical Cube Scanner & Step-by-Step 3D Solver (`Help with Cube`)**: Scan via 6-side image upload or local-only consent-gated webcam detection, validate parity, and follow beginner-stage instructions with animated move GIFs.
- **Speedcubing Turn SFX, Colorways & Custom Keybinds**: Two-page Settings (`General` | `Custom Keybinds` grouped by puzzle), Web Audio speedcube sound synthesis (`Magnetic Snap`, `Crisp Clack`, `Soft Lubed`) with volume slider, and 5 real-life cube finishes (`Classic Black Bezel`, `Stickerless Bright`, `Primary Internals`, `Macaron Pastel`, `Carbon Contrast`).
- **WCA 15s Inspection, Ao5 / Ao12 Stats & Algorithm Drills**: Competition countdown with 8s/12s audio cues, `+2` / `DNF` penalties, persistent session history, inverted OLL/PLL/PBL/Parity drills, and WebBLE Smart Cube support (GAN / Giiker / Moyu).
- **Learn Puzzles & Move Notation Glossary**: Guided 3x3, 2x2, 4x4, and Pyraminx tutorials with embedded YouTube chapters, looping move `.gif` previews, and one-click "Try on puzzle" playback.

> [!NOTE]
> EiCube is built with vanilla DOM APIs for zero UI framework overhead, using Three.js as the sole runtime dependency. All webcam frames in `Help with Cube` stay 100% local in the browser.

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
│   ├── types.ts            # Type definitions, face normals, and 5 IRL Color Scheme palettes
│   ├── CubeState.ts        # Pure logical representation (2x2, 3x3, 4x4) + 54-sticker net helpers
│   ├── colorClassifier.ts  # CIE Lab RGB sticker classification & center-anchor auto-calibration
│   ├── solver3x3.ts        # 3x3 parity diagnostics and deterministic stage-by-stage solver
│   ├── pyraminxState.ts    # Pure logical representation, moves, and scramble for Pyraminx
│   ├── moves.ts            # Physical layer and axis rotation mappings
│   ├── notation.ts         # Parser for notation strings, multipliers, and inversions
│   ├── scramble.ts         # Random scramble and inverse sequence generator
│   ├── cameraResolver.ts   # Vector math for resolving camera view to cube faces
│   └── smartCube.ts        # WebBLE GATT smart cube client (GAN / Giiker / Moyu) + virtual tester
├── render/
│   ├── SphereArcballControls.ts # Full-sphere X/Y/Z quaternion arcball controls + momentum inertia
│   ├── RubiksCubeScene.ts  # Three.js cube scene, raycasting, touch drag, custom state loading
│   ├── PyraminxScene.ts    # Three.js regular tetrahedron puzzle renderer with speedcube borders
│   └── AnimationQueue.ts   # Eased animation queue with dynamic speed scaling
├── content/
│   ├── guideData.ts        # 3x3 beginner method, notation guide, and CFOP data
│   ├── otherCubesData.ts   # Structured guides and algorithms for 3x3, 2x2, 4x4, and Pyraminx
│   ├── movesGlossaryData.ts # 64-move WCA & Pyraminx notation glossary + solver GIF lookup helper
│   └── videoData.ts        # Curated YouTube video tutorials with metadata and chapter timestamps
├── ui/
│   ├── theme.ts            # Polar Light / Pine-Emerald Dark theme switcher with custom events
│   ├── matrixBackdrop.ts   # Dual-theme binary rain canvas backdrop respecting reduced motion
│   ├── tabs.ts             # 4-way tab manager (Home, Puzzle, Learn Puzzles, Help with Cube)
│   ├── landing.ts          # Zero-login editorial landing page (EiCube — 3D cubing in browser)
│   ├── controls.ts         # Single-row trainer topbar, Choose Puzzle dropdown, Tools drawer, Moves Pad
│   ├── helpCube.ts         # Help with Cube scanner (6-side upload & consent-gated webcam) + 3D guide
│   ├── sessionStats.ts     # Persistent solve history, Ao5/Ao12 calculation, +2/DNF stats modal
│   ├── drillModal.ts       # Inverted OLL/PLL/PBL/Parity algorithm drill selector
│   ├── settings.ts         # Two-page Settings modal (General w/ Sun/Moon, SFX, Colors | Custom Keybinds)
│   ├── tutorial.ts         # Multi-step onboarding overlay
│   ├── tipsModal.ts        # Solving diagnostic and quick tips modal
│   ├── guideRenderer.ts    # Learn Puzzles guide with embedded videos and inline looping move GIFs
│   └── toast.ts            # Notification and toast alert manager
├── tests/
│   └── cube.test.ts        # Vitest suite (24 tests: puzzles, 3x3 solver, net parity, classifier, drills)
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
