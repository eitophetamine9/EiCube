# EiCube

Interactive 3D Rubik's Cube trainer and multi-puzzle guide built with Three.js, TypeScript, and Vite. Features camera-relative rotational controls, vertical move history, direct prime keybindings, diagnostic solving hints, and comprehensive guides for 3x3, 2x2, 4x4, and Pyraminx.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vite.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/)

---

## Overview

EiCube provides a digital training environment for both beginner and competitive speedcubers. Unlike traditional digital cubes that enforce fixed global world axes, EiCube dynamically resolves all moves relative to your current camera viewpoint.

> [!IMPORTANT]
> **Camera-Relative Rotations**: Turning the **R** face always turns whichever face is currently positioned on the viewer's right side, regardless of camera orbit angle. If you rotate the view 180 degrees, pressing R acts on the face now on your right, preserving intuitive tactile execution.

---

## Key Features

- **Ergonomic Studio Layout**:
  - **Left Sidebar**: Move controls with inline keybinding display and click-to-rebind capability.
  - **Right Sidebar**: Vertical move history log with step numbers and auto-scrolling.
  - **Top Floating Bar**: Solved indicator badge, stopwatch timer (`00:00.00`), scramble, reset, undo, and animation speed slider.
  - **Unobstructed 3D Stage**: The 3D puzzle remains completely clear in the center viewport.
- **Dedicated Prime & Custom Keybindings**:
  - Rebind any action directly (e.g. set physical key `D` to perform `R`).
  - Assign single dedicated keyboard keys for prime moves (`R'`, `U'`, `L'`, `D'`, `F'`, `B'`) without holding Shift or clicking modifier toggles.
  - One-click presets: Standard layout or Two-Hand Pro Speedcubing layout.
- **Diagnostic Tips & Guidance**:
  - Contextual question mark (`?`) button in header opening a quick solving diagnostic to troubleshoot common beginner mistakes (flipped edges, trapped corners, inverted middle edges, final D-move omission).
- **Multi-Puzzle Support (Other Cubes Tab)**:
  - **2x2 Pocket Cube**: Full 3D model, scramble, and Ortega / Beginner solving guide.
  - **4x4 Rubik's Revenge**: Full 3D model, outer and wide turns (`Rw, Uw, Fw`), and Yau / Reduction guide with OLL and PLL parity algorithms.
  - **Pyraminx**: Real 3D regular tetrahedron with 4 color faces (Yellow, Red, Green, Blue), tip rotations (`u, l, r, b`), layer turns (`U, L, R, B`), scramble generator, and V-First solving guide.
- **Beginner 3x3 Layer-by-Layer Guide**:
  - 7 structured steps with goals, case recognition, and one-click "Try it on the cube" interactive algorithm execution.
- **Performance & Smooth Motion**:
  - Smooth page transitions and native smooth scrolling.
  - Eased animation queuing with dynamic speed acceleration under rapid input.
  - System `prefers-reduced-motion` compliance.

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
│   ├── PyraminxScene.ts    # Three.js regular tetrahedron puzzle renderer
│   └── AnimationQueue.ts   # Eased animation queue with dynamic speed scaling
├── content/
│   ├── guideData.ts        # 3x3 beginner method, notation guide, and CFOP data
│   └── otherCubesData.ts   # Structured guides and algorithms for 2x2, 4x4, and Pyraminx
├── ui/
│   ├── tabs.ts             # 3-way tab manager (3x3 Cube, Other Cubes, Learn Guide)
│   ├── controls.ts         # Left keybind pad, right vertical history, and top floating bar
│   ├── settings.ts         # Keybind rebinding modal, direct prime binds, presets
│   ├── tutorial.ts         # Multi-step onboarding overlay
│   ├── tipsModal.ts        # Solving diagnostic and quick tips modal
│   ├── otherCubes.ts       # Other Cubes tab manager with puzzle switcher and 3D scenes
│   ├── guideRenderer.ts    # 3x3 guide rendering with one-click algorithm execution
│   └── toast.ts            # Notification manager
├── tests/
│   └── cube.test.ts        # Vitest suite covering 3x3, 2x2, 4x4, Pyraminx, and keybindings
├── main.ts                 # Application entry point
└── style.css               # Styling, smooth transitions, and responsive layout
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
