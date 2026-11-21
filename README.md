# EiCube

Interactive 3D Rubik's Cube trainer and solving guide built with Three.js, TypeScript, and Vite. Designed with camera-relative rotational controls, real-time animation queuing, customizable keybindings, and an interactive step-by-step beginner solving guide.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vite.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/)

---

## Overview

EiCube provides a digital training environment for both beginner and experienced speedcubers. Unlike traditional digital cubes that enforce fixed world axes, EiCube resolves all moves relative to your current camera viewpoint.

> [!IMPORTANT]
> **Camera-Relative Rotations**: Turning the **R** face always turns whichever face is currently positioned on the viewer's right side, regardless of how the cube is orbited. If you rotate the view 180 degrees, pressing R will act on the face currently on your right, preserving intuitive tactile execution.

---

## Key Features

- **Physically Modeled 3D Cube**: 26 individual cubies featuring dark rounded-edge bodies and standard WCA vinyl sticker planes (White, Yellow, Green, Blue, Red, Orange).
- **Camera-Relative Move Resolver**: Evaluates camera view vectors against face normals using dot-product maximization to map view commands (`U`, `D`, `L`, `R`, `F`, `B`, slices `M`/`E`/`S`, rotations `x`/`y`/`z`, wide moves `r`/`l`/`u`/`d`/`f`/`b`) to the correct layer in real time.
- **Queued Interpolation Engine**: Smooth eased turn animations (customizable from 60ms to 400ms) with automatic queue acceleration under rapid input to prevent desynchronization or dropped inputs. Cubie positions and quaternions automatically snap to exact coordinate planes upon completion.
- **Layer-by-Layer Beginner Guide**: Comprehensive 7-step guide covering the White Cross, First Layer Corners, Middle Layer Edges, Yellow Cross, Yellow Edge Permutation, Yellow Corner Positioning, and Yellow Corner Orientation.
- **Interactive Execution**: Every algorithm in the guide includes a "Try it on the cube" action that switches to the 3D viewport and demonstrates the algorithm sequence directly on the cube.
- **Scramble & Timer**: Generates valid 20 to 25 move random sequences obeying WCA consecutive-move separation rules. Includes an automatic inspection/solve timer that starts on your first move after a scramble and stops upon reaching the solved state.
- **Customizable Keybindings**: Full keyboard shortcut configuration with conflict detection and `localStorage` persistence.
- **Reduced Motion Support**: Detects and respects system `prefers-reduced-motion` settings for instantaneous animations.

> [!NOTE]
> The app is built with vanilla DOM APIs for zero UI overhead, using Three.js as the sole runtime dependency.

---

## Architecture

```
src/
├── cube/
│   ├── types.ts            # Type definitions, face normals, standard color constants
│   ├── CubeState.ts        # Pure logical representation supporting arbitrary cube size
│   ├── moves.ts            # Physical layer and axis rotation mappings
│   ├── notation.ts         # Parser for notation strings, multipliers, and inversions
│   ├── scramble.ts         # Random scramble and inverse sequence generator
│   └── cameraResolver.ts   # Vector math for resolving camera view to cube faces
├── render/
│   ├── RubiksCubeScene.ts  # Three.js scene, lighting, materials, and orbit controls
│   └── AnimationQueue.ts   # Eased animation queue with dynamic speed scaling
├── content/
│   └── guideData.ts        # Structured data for beginner method, notation, and CFOP
├── ui/
│   ├── tabs.ts             # Tab switching between 3D Viewport and Guide
│   ├── controls.ts         # Scramble, reset, undo, timer, speed slider, and move pad
│   ├── settings.ts         # Keyboard rebinding modal with conflict detection
│   ├── tutorial.ts         # Multi-step onboarding overlay
│   ├── guideRenderer.ts    # Guide rendering with one-click algorithm execution
│   └── toast.ts            # Notification manager
├── tests/
│   └── cube.test.ts        # Unit test suite for pure cube logic and invariants
├── main.ts                 # Application entry point
└── style.css               # Clean styling and responsive design
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

## Deployment to Vercel

This project is configured as a static build with zero server requirements.

### Deploying via Vercel CLI

```bash
npm install -g vercel
vercel
```

### Deploying via Vercel Dashboard

1. Push your repository to GitHub: `https://github.com/eitophetamine9/EiCube`
2. In the Vercel Dashboard, select **Add New Project** and import the `EiCube` repository.
3. Keep default settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**.

> [!NOTE]
> No environment variables or custom serverless configurations are required.

---

## License

MIT License. Open source and free for personal and educational use.
