import { VideoTutorial } from './videoData';

export interface GuideAlgorithm {
  name: string;
  notation: string;
  description: string;
}

export interface GuideStep {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  goal: string;
  recognition: string;
  tip?: string;
  algorithms: GuideAlgorithm[];
}

export interface NotationGuideItem {
  code: string;
  name: string;
  description: string;
  demoAlgorithm: string;
}

export interface GuideData {
  notation: {
    faces: NotationGuideItem[];
    modifiers: NotationGuideItem[];
    slices: NotationGuideItem[];
    rotations: NotationGuideItem[];
    wide: NotationGuideItem[];
  };
  steps: GuideStep[];
  advanced: {
    cfopTitle: string;
    cfopStages: { stage: string; name: string; description: string; cases: string }[];
    fingerTricks: { title: string; text: string }[];
  };
}

export const GUIDE_DATA: GuideData = {
  notation: {
    faces: [
      { code: 'R', name: 'Right', description: 'Turn the right layer clockwise 90° (looking directly at Right)', demoAlgorithm: 'R' },
      { code: 'L', name: 'Left', description: 'Turn the left layer clockwise 90° (looking directly at Left)', demoAlgorithm: 'L' },
      { code: 'U', name: 'Up / Top', description: 'Turn the top layer clockwise 90° (looking directly at Top)', demoAlgorithm: 'U' },
      { code: 'D', name: 'Down / Bottom', description: 'Turn the bottom layer clockwise 90° (looking directly at Bottom)', demoAlgorithm: 'D' },
      { code: 'F', name: 'Front', description: 'Turn the front layer clockwise 90° (facing you)', demoAlgorithm: 'F' },
      { code: 'B', name: 'Back', description: 'Turn the back layer clockwise 90° (facing away from you)', demoAlgorithm: 'B' },
    ],
    modifiers: [
      { code: "R'", name: 'Prime (Inverse)', description: "Counter-clockwise 90° turn (indicated by an apostrophe or 'prime')", demoAlgorithm: "R'" },
      { code: 'R2', name: 'Double Turn', description: 'Half turn: 180° rotation of the layer in either direction', demoAlgorithm: 'R2' },
      { code: '(...) x2', name: 'Group Multiplier', description: 'Repeats the enclosed sequence multiple times, e.g. sexy move x6', demoAlgorithm: "(R U R' U') x6" },
    ],
    slices: [
      { code: 'M', name: 'Middle Slice', description: 'Layer between L and R; turns in the same direction as L', demoAlgorithm: 'M' },
      { code: 'E', name: 'Equator Slice', description: 'Layer between U and D; turns in the same direction as D', demoAlgorithm: 'E' },
      { code: 'S', name: 'Standing Slice', description: 'Layer between F and B; turns in the same direction as F', demoAlgorithm: 'S' },
    ],
    rotations: [
      { code: 'x', name: 'Cube Rotation X', description: 'Rotate entire cube around X axis in direction of R', demoAlgorithm: 'x' },
      { code: 'y', name: 'Cube Rotation Y', description: 'Rotate entire cube around Y axis in direction of U', demoAlgorithm: 'y' },
      { code: 'z', name: 'Cube Rotation Z', description: 'Rotate entire cube around Z axis in direction of F', demoAlgorithm: 'z' },
    ],
    wide: [
      { code: 'r', name: 'Wide Right', description: 'Turn the two rightmost layers simultaneously in direction of R', demoAlgorithm: 'r' },
      { code: 'l', name: 'Wide Left', description: 'Turn the two leftmost layers simultaneously in direction of L', demoAlgorithm: 'l' },
      { code: 'u', name: 'Wide Up', description: 'Turn the top two layers simultaneously in direction of U', demoAlgorithm: 'u' },
      { code: 'f', name: 'Wide Front', description: 'Turn the front two layers simultaneously in direction of F', demoAlgorithm: 'f' },
    ],
  },
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      title: 'The White Cross',
      subtitle: 'Build the foundation on the white face',
      goal: 'Form a white plus/cross on the white face where each white edge piece also aligns in color with its adjacent side center (Green, Red, Blue, Orange).',
      recognition: 'Locate white edge pieces on the cube. You can first bring all 4 white edges around the yellow center ("daisy"), then match each edge to its side center and rotate 180° (F2) into place.',
      tip: 'Keep the white center facing Down (or Up if practicing beginner orientation). Always verify that side colors match centers.',
      algorithms: [
        {
          name: 'Flip Inverted Edge',
          notation: "F' U' R U",
          description: 'Flips a white edge in the front position so the white sticker faces the correct direction.',
        },
        {
          name: 'Double Turn Insertion',
          notation: 'F2',
          description: 'Once the side color of a top-layer white edge matches its center, rotate that face 180° to bring white to the bottom.',
        },
      ],
    },
    {
      id: 'step-2',
      stepNumber: 2,
      title: 'White Corners (First Layer)',
      subtitle: 'Complete the entire bottom layer',
      goal: 'Insert all 4 white corner pieces into their correct positions so the entire first layer is completely solved with clean matching colored bars on all four sides.',
      recognition: 'Find a corner piece containing white in the top layer. Rotate the top layer until this corner is directly above where it belongs (between the matching side colors).',
      tip: 'The "Right-Hand Trigger" (Sexy Move) is the most versatile sequence in cubing. Practice repeating it smoothly.',
      algorithms: [
        {
          name: 'Right-Hand Sexy Move',
          notation: "R U R' U'",
          description: 'Repeated 1 to 5 times to insert a corner from the top-right position down into its slot.',
        },
        {
          name: 'Left-Hand Trigger',
          notation: "L' U' L U",
          description: 'Mirrored trigger for inserting a corner when white faces the left side.',
        },
      ],
    },
    {
      id: 'step-3',
      stepNumber: 3,
      title: 'Middle Layer Edges (Second Layer)',
      subtitle: 'Solve the middle four edge pieces',
      goal: 'Insert all 4 edges into the middle layer without disturbing the solved white first layer.',
      recognition: 'Look at the top layer for edge pieces that DO NOT contain yellow. Turn the top layer to match the front sticker with its center, forming a vertical "T". Determine whether it needs to move down-right or down-left.',
      tip: 'If an edge is stuck in the middle layer oriented incorrectly, insert a dummy yellow piece using either algorithm to pop it out to the top layer.',
      algorithms: [
        {
          name: 'Insert to Right',
          notation: "U R U' R' U' F' U F",
          description: 'Moves the top-front edge piece into the front-right middle slot.',
        },
        {
          name: 'Insert to Left',
          notation: "U' L' U L U F U' F'",
          description: 'Moves the top-front edge piece into the front-left middle slot.',
        },
      ],
    },
    {
      id: 'step-4',
      stepNumber: 4,
      title: 'The Yellow Cross',
      subtitle: 'Create a cross on the top face',
      goal: 'Orient all 4 yellow edge pieces on the top layer so yellow faces Up, creating a yellow cross. The side colors do not need to match yet.',
      recognition: 'Look at the yellow face. You will see one of three patterns: a Dot (only center yellow), an "L" angle (2 adjacent edges yellow), or a Line (2 opposite edges yellow).',
      tip: 'Hold the "L" angle in the top-left (back-left), or hold the Line horizontally before executing.',
      algorithms: [
        {
          name: 'Line to Cross (Standard)',
          notation: "F R U R' U' F'",
          description: 'Turns a horizontal yellow line into a complete yellow cross.',
        },
        {
          name: 'Angle to Cross (Wide)',
          notation: "f R U R' U' f'",
          description: 'Turns the 9 o\'clock / 12 o\'clock "L" angle directly into a yellow cross using wide front turns.',
        },
      ],
    },
    {
      id: 'step-5',
      stepNumber: 5,
      title: 'Orient Yellow Edges',
      subtitle: 'Align yellow edges with side centers',
      goal: 'Permute the yellow edges so the side sticker of each yellow edge matches its corresponding side center (Green, Red, Blue, Orange).',
      recognition: 'Rotate the top layer (U) until at least two edges match their side centers. If opposite edges match, run the algorithm once from any angle. If adjacent edges match, hold one at the back and one on the right.',
      tip: 'This algorithm is known as the "Sune" (pronounced soo-nay). It cycles three edges counter-clockwise while preserving the yellow cross.',
      algorithms: [
        {
          name: 'Sune Edge Permutation',
          notation: "R U R' U R U2 R' U",
          description: 'Swaps and cycles the top edges into their proper positions.',
        },
      ],
    },
    {
      id: 'step-6',
      stepNumber: 6,
      title: 'Position Yellow Corners',
      subtitle: 'Put corners in their correct physical spots',
      goal: 'Move all 4 yellow corner pieces to their correct locations between their matching centers. Their yellow orientation does not matter yet.',
      recognition: 'Check if any corner is in its correct place (even if twisted). Hold that correct corner in the top-right-front (UFR) position. If none are correct, execute the algorithm once to create one.',
      tip: 'Niklas cycles the three other corners without touching the top-right corner.',
      algorithms: [
        {
          name: 'Niklas Corner Permutation',
          notation: "U R U' L' U R' U' L",
          description: 'Cycles the three remaining corners until all four corners are in their correct slots.',
        },
      ],
    },
    {
      id: 'step-7',
      stepNumber: 7,
      title: 'Orient Yellow Corners (Final Solve)',
      subtitle: 'Twist the corners to complete the cube',
      goal: 'Rotate each corner so yellow faces Up. When all 4 are oriented, the cube is completely solved!',
      recognition: 'Hold the cube with an unsolved corner in the top-right-front (UFR) position. Do NOT rotate the whole cube between corners!',
      tip: 'CRITICAL: Always finish the full 4-move cycle (R\' D\' R D). When a corner finishes, turn ONLY the top layer (U) to bring the next unsolved corner into UFR.',
      algorithms: [
        {
          name: 'Corner Orientation Cycle',
          notation: "(R' D' R D) x2",
          description: 'Twists the UFR corner. Run twice (or 4 times) until yellow faces up, then turn U to the next corner.',
        },
      ],
    },
  ],
  advanced: {
    cfopTitle: 'Beyond Beginner: The CFOP Method (Fridrich)',
    cfopStages: [
      {
        stage: 'Cross',
        name: 'Efficient Cross',
        description: 'Solve the bottom 4 cross edges simultaneously in 8 moves or fewer, planned entirely during the 15-second inspection.',
        cases: 'Intuitive (Avg 6 moves)',
      },
      {
        stage: 'F2L',
        name: 'First Two Layers',
        description: 'Pair each corner with its corresponding middle edge in the top layer and insert both together into their slot in one sequence.',
        cases: '41 standard cases',
      },
      {
        stage: 'OLL',
        name: 'Orientation of the Last Layer',
        description: 'Orient the entire top layer in a single algorithm so all yellow stickers face Up.',
        cases: '57 algorithms (2-look OLL: 9 algs)',
      },
      {
        stage: 'PLL',
        name: 'Permutation of the Last Layer',
        description: 'Permute all pieces on the top layer in one final algorithm to complete the cube.',
        cases: '21 algorithms (2-look PLL: 6 algs)',
      },
    ],
    fingerTricks: [
      {
        title: 'Index Finger Flicks (U / U\')',
        text: 'Never turn the U layer using your whole hand. Use your right index finger to pull the top-right corner toward you for U, or your left index finger for U\'.',
      },
      {
        title: 'Index Finger Push (U\')',
        text: 'You can perform U\' with your right hand by pushing the top-back-right corner forward with the first knuckle of your right index finger.',
      },
      {
        title: 'Double Flick (U2)',
        text: 'Perform U2 in a single fluid motion: flick first with your right index finger, followed immediately by your right middle finger.',
      },
      {
        title: 'Thumb and Ring Finger Tricks (F / D)',
        text: 'Turn the F face with your right index finger pushing down, or right thumb pushing up. Turn the D layer using your left or right ring finger.',
      },
    ],
  },
};

export interface SpeedcubeAlgorithmItem {
  id: string;
  name: string;
  category: string;
  notation: string;
  description: string;
  recognition: string;
}

export interface SpeedcubePuzzleSection {
  puzzleId: '3x3' | '2x2' | '4x4' | 'pyraminx';
  title: string;
  subtitle: string;
  methodName: string;
  video: VideoTutorial;
  algorithms: SpeedcubeAlgorithmItem[];
}

export const ADVANCED_SPEEDCUBING_DATA: Record<string, SpeedcubePuzzleSection> = {
  '3x3': {
    puzzleId: '3x3',
    title: '3×3 CFOP Speedcubing Algorithms',
    subtitle: 'Championship-grade speedsolving system: Cross, F2L, OLL, and full PLL.',
    methodName: 'CFOP (Fridrich Method)',
    video: {
      puzzleId: '3x3',
      title: 'All 21 PLL Algorithms & Finger Tricks (Speedcubing)',
      creator: 'J Perm',
      videoId: 'vU6HsK3hvQs',
      duration: '18:50',
      views: '3.8M+ views',
      description: 'Master full PLL for CFOP speedsolving. Covers recognition, optimal finger tricks, and execution for T-Perm, Y-Perm, J-Perm, H-Perm, and all 21 permutation cases.',
      chapters: [
        { time: '0:00', title: 'PLL Introduction & Flow', seconds: 0 },
        { time: '0:42', title: 'Adjacent Corner Swaps (T-Perm, J-Perm)', seconds: 42 },
        { time: '4:15', title: 'Diagonal Corner Swaps (Y-Perm, V-Perm)', seconds: 255 },
        { time: '8:30', title: 'Edge-Only Permutations (H, Z, Ua, Ub)', seconds: 510 },
        { time: '13:00', title: 'G-Permutations & Advanced Fingertricks', seconds: 780 },
      ],
    },
    algorithms: [
      {
        id: 't-perm',
        name: 'T-Perm (Adjacent Corner Swap)',
        category: 'PLL',
        notation: "R U R' U' R' F R2 U' R' U' R U R' F'",
        description: 'Swaps the front-right and back-right corners while swapping the front and right edges.',
        recognition: 'Headlights on the left side, matching block on the front right.',
      },
      {
        id: 'y-perm',
        name: 'Y-Perm (Diagonal Corner Swap)',
        category: 'PLL',
        notation: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
        description: 'Swaps diagonally opposite corners (front-left and back-right) and two adjacent edges.',
        recognition: 'No headlights on any face; 1 matching corner-edge block.',
      },
      {
        id: 'jb-perm',
        name: 'Jb-Perm (Adjacent Swap & Edge)',
        category: 'PLL',
        notation: "R U R' F' R U R' U' R' F R2 U' R'",
        description: 'One of the fastest, most ergonomic PLL algorithms in speedcubing.',
        recognition: 'Complete 1x1x3 solved bar on the left side with headlights on the right.',
      },
      {
        id: 'h-perm',
        name: 'H-Perm (Opposite Edge Swap)',
        category: 'PLL',
        notation: 'M2 U M2 U2 M2 U M2',
        description: 'Swaps opposite edge pairs (Front <-> Back, Left <-> Right) with all corners solved.',
        recognition: 'All 4 corners solved; opposite contrasting color on all 4 side edges.',
      },
      {
        id: 'z-perm',
        name: 'Z-Perm (Adjacent Edge Swap)',
        category: 'PLL',
        notation: "M' U M2 U M2 U M' U2 M2",
        description: 'Swaps adjacent edge pairs (Front <-> Right, Back <-> Left) with slice turns.',
        recognition: 'All corners solved; edges need diagonal swap pairs.',
      },
      {
        id: 'ua-perm',
        name: 'Ua-Perm (3-Edge Cycle CCW)',
        category: 'PLL',
        notation: "R U' R U R U R U' R' U' R2",
        description: 'Cycles 3 top edges counter-clockwise while preserving all 4 corners.',
        recognition: 'Solved bar on Back face; front edge needs to go to Right.',
      },
      {
        id: 'ub-perm',
        name: 'Ub-Perm (3-Edge Cycle CW)',
        category: 'PLL',
        notation: "R2 U R U R' U' R' U' R' U R'",
        description: 'Cycles 3 top edges clockwise while preserving all 4 corners.',
        recognition: 'Solved bar on Back face; front edge needs to go to Left.',
      },
      {
        id: 'sune',
        name: 'Sune (OLL 27)',
        category: 'OLL',
        notation: "R U R' U R U2 R'",
        description: 'Orients 3 corners counter-clockwise when 1 corner is already oriented.',
        recognition: 'Single yellow corner on top-left, yellow sticker facing front on right corner.',
      },
      {
        id: 'anti-sune',
        name: 'Anti-Sune (OLL 26)',
        category: 'OLL',
        notation: "R U2 R' U' R U' R'",
        description: 'Mirror of Sune: orients 3 corners clockwise.',
        recognition: 'Single yellow corner on top-right, yellow sticker facing front on left corner.',
      },
      {
        id: 'sexy-move',
        name: 'Sexy Move Trigger',
        category: 'Fingertricks',
        notation: "R U R' U'",
        description: 'The fundamental 4-move building block of speedcubing. Extremely fast right-hand trigger.',
        recognition: 'Used throughout F2L pairing, OLL, and PLL.',
      },
      {
        id: 'sledgehammer',
        name: 'Sledgehammer Trigger',
        category: 'Fingertricks',
        notation: "R' F R F'",
        description: 'Changes edge orientation while inserting pairs into the front-right slot.',
        recognition: 'Essential trigger for CFOP F2L edge control.',
      },
    ],
  },
  '2x2': {
    puzzleId: '2x2',
    title: '2×2 Ortega Speedcubing (PBL & OLL)',
    subtitle: 'Championship 3-step method: Solve first face, orient opposite face, permute both layers in one look.',
    methodName: 'Ortega Method',
    video: {
      puzzleId: '2x2',
      title: 'How to Solve 2x2 with Ortega Method (Sub-4 Speedcubing)',
      creator: 'J Perm',
      videoId: 'z2gOUzMmY3w',
      duration: '6:32',
      views: '2.1M+ views',
      description: 'The premier speedcubing method for 2x2: solve any first face intuitively (ignoring side bars), orient the opposite layer in 1 look (OLL), and permute both layers (PBL).',
      chapters: [
        { time: '0:00', title: 'Ortega Method Overview', seconds: 0 },
        { time: '1:10', title: 'Step 1: Intuitive First Face', seconds: 70 },
        { time: '2:15', title: 'Step 2: 2x2 OLL Cases', seconds: 135 },
        { time: '3:50', title: 'Step 3: PBL Bar Recognition', seconds: 230 },
        { time: '5:10', title: 'PBL Algorithms & Execution', seconds: 310 },
      ],
    },
    algorithms: [
      {
        id: 'pbl-adj-adj',
        name: 'PBL: Adjacent / Adjacent',
        category: 'PBL',
        notation: "R2 U' B2 U2 R2 U' R2",
        description: 'Swaps adjacent corners on both top and bottom layers simultaneously.',
        recognition: 'One solid matching bar on top, one solid matching bar on bottom. Hold both bars on the Front.',
      },
      {
        id: 'pbl-diag-diag',
        name: 'PBL: Diagonal / Diagonal',
        category: 'PBL',
        notation: 'R2 F2 R2',
        description: 'Ultra-fast 3-move algorithm that swaps diagonally opposite corners on both layers.',
        recognition: 'No matching bars on either layer (all opposite colors on both top and bottom).',
      },
      {
        id: 'pbl-adj-none',
        name: 'PBL: Adjacent / Solved',
        category: 'PBL',
        notation: "R U' R F2 R' U R'",
        description: 'Swaps adjacent corners on top layer while bottom layer is already completely solved.',
        recognition: 'One matching bar on top, bottom layer fully solved. Hold top bar on Left.',
      },
      {
        id: 'pbl-none-adj',
        name: 'PBL: Solved / Adjacent',
        category: 'PBL',
        notation: "R' U R' F2 R F' R",
        description: 'Swaps adjacent corners on the bottom layer while top layer is already solved.',
        recognition: 'Top layer fully solved, one matching bar on bottom. Hold bottom bar on Left.',
      },
      {
        id: 'pbl-diag-none',
        name: 'PBL: Diagonal / Solved (Y-Perm)',
        category: 'PBL',
        notation: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
        description: 'Diagonal swap on top layer with bottom layer solved.',
        recognition: 'No bars on top layer, bottom layer completely solved.',
      },
      {
        id: 'ortega-sune',
        name: 'OLL: Sune',
        category: 'OLL',
        notation: "R U R' U R U2 R'",
        description: '1 yellow corner facing Up, clockwise rotation for the other 3.',
        recognition: '1 yellow sticker facing Up on front-left.',
      },
      {
        id: 'ortega-pi',
        name: 'OLL: Pi',
        category: 'OLL',
        notation: "F (R U R' U') (R U R' U') F'",
        description: 'Orients 4 unoriented yellow corners with two pairs of opposite headlights.',
        recognition: 'No yellow corners facing Up; two headlights on left and two opposite on right.',
      },
    ],
  },
  '4x4': {
    puzzleId: '4x4',
    title: '4×4 Yau Parity & Speedcubing',
    subtitle: 'Master the OLL and PLL parities that occur on even-layered cubes, plus fast edge pairing.',
    methodName: 'Yau & Reduction Parities',
    video: {
      puzzleId: '4x4',
      title: '4x4 Parity Algorithms & Fingertricks (OLL & PLL)',
      creator: 'J Perm',
      videoId: '1M9DE1WyzO4',
      duration: '5:10',
      views: '1.4M+ views',
      description: 'Fast, ergonomic speedsolving execution for 4x4 OLL parity (single flipped edge) and PLL parity (two swapped edges) with optimal finger tricks.',
      chapters: [
        { time: '0:00', title: 'Understanding 4x4 Parities', seconds: 0 },
        { time: '0:45', title: 'OLL Parity Algorithm Breakdown', seconds: 45 },
        { time: '2:15', title: 'PLL Parity Algorithm (Opposite Swap)', seconds: 135 },
        { time: '3:30', title: 'Adjacent PLL Parity Fast Execution', seconds: 210 },
      ],
    },
    algorithms: [
      {
        id: 'oll-parity',
        name: 'OLL Parity (Flipped Edge Pair)',
        category: 'Parity',
        notation: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'",
        description: 'Flips a single top-layer edge pair that is impossible on a standard 3x3 cube.',
        recognition: 'Top layer has an odd number of oriented edges (e.g. 1 or 3 yellow edges instead of 0, 2, or 4). Hold flipped edge in Front.',
      },
      {
        id: 'pll-parity-opp',
        name: 'PLL Parity (Opposite Edge Swap)',
        category: 'Parity',
        notation: '2R2 U2 2R2 Uw2 2R2 2Uw2',
        description: 'Swaps opposite edge pairs on the top layer without affecting any other piece.',
        recognition: 'Front and Back top edge pairs are swapped, Left and Right edges are solved.',
      },
      {
        id: 'pll-parity-adj',
        name: 'Adjacent PLL Parity (Adjacent Swap)',
        category: 'Parity',
        notation: "2R2 U2 2R2 Uw2 2R2 2Uw2 + (R U R' U' R' F R2 U' R' U' R U R' F')",
        description: 'Combines the standard PLL parity with a T-Perm to swap two adjacent edge pairs.',
        recognition: 'Two adjacent top edges are swapped while the other two are solved.',
      },
      {
        id: 'edge-flip-trigger',
        name: 'Edge Flipping Trigger (Slice-Flip-Slice)',
        category: 'Edge Pairing',
        notation: "R U R' F R' F' R",
        description: 'Flips the front-right edge pair in place during 3-2-2-2 edge reduction.',
        recognition: 'Used whenever the matching edge wing needs to be inverted before slice insertion.',
      },
    ],
  },
  'pyraminx': {
    puzzleId: 'pyraminx',
    title: 'Pyraminx L4E Speedcubing (Last 4 Edges)',
    subtitle: 'The sub-5 standard: build a 3-edge V-base and solve the Last 4 Edges with intuitive triggers.',
    methodName: 'L4E (Last 4 Edges Method)',
    video: {
      puzzleId: 'pyraminx',
      title: 'Intuitive L4E Pyraminx Tutorial (Speedcubing)',
      creator: 'SpeedyGoneCuber',
      videoId: '_S2iDihTuxw',
      duration: '5:48',
      views: '180K+ views',
      description: 'Master the Last 4 Edges (L4E) method for Pyraminx. Build a 3-edge V-base, recognize top edge patterns, and solve with lightning-fast Sledgehammer and Hedgeslammer triggers.',
      chapters: [
        { time: '0:00', title: 'L4E Overview & V-Base', seconds: 0 },
        { time: '1:00', title: 'Sledgehammer & Hedgeslammer', seconds: 60 },
        { time: '2:15', title: '3-Edge Cycle Algorithms', seconds: 135 },
        { time: '3:45', title: 'Edge Flip Algorithms (Superflip)', seconds: 225 },
        { time: '4:50', title: 'Sub-5 Practice Strategy', seconds: 290 },
      ],
    },
    algorithms: [
      {
        id: 'pyra-sledge',
        name: 'Sledgehammer (Core Trigger)',
        category: 'Triggers',
        notation: "R' L R L'",
        description: 'The fundamental trigger of Pyraminx speedcubing. Fast downward rolling motion.',
        recognition: 'Used for V-base insertion and L4E orientation.',
      },
      {
        id: 'pyra-hedge',
        name: 'Hedgeslammer (Core Trigger)',
        category: 'Triggers',
        notation: "L R' L' R",
        description: 'The inverse / mirror trigger of sledgehammer starting with left hand.',
        recognition: 'Used when target edge needs left-handed insertion.',
      },
      {
        id: 'pyra-cw-cycle',
        name: '3-Edge Cycle Clockwise',
        category: 'L4E Cycles',
        notation: "R U R' U R U R'",
        description: 'Cycles the 3 top-layer edges in a clockwise loop.',
        recognition: 'Top layer edges are oriented but need to shift clockwise.',
      },
      {
        id: 'pyra-ccw-cycle',
        name: '3-Edge Cycle Counter-Clockwise',
        category: 'L4E Cycles',
        notation: "R U' R' U' R U' R'",
        description: 'Cycles the 3 top-layer edges in a counter-clockwise loop.',
        recognition: 'Top layer edges are oriented but need to shift counter-clockwise.',
      },
      {
        id: 'pyra-superflip',
        name: 'Double Edge Flip (Superflip)',
        category: 'L4E Flips',
        notation: "R' L R L' U' L' U L",
        description: 'Flips both front top edges in place without disturbing centers or base.',
        recognition: 'Two top edges are in their correct positions but flipped upside down.',
      },
      {
        id: 'pyra-adj-flip',
        name: 'Adjacent Edge Flip Cycle',
        category: 'L4E Flips',
        notation: "R U' R' U L' U L",
        description: 'Simultaneously cycles and flips adjacent edges into solved positions.',
        recognition: 'One edge solved, other two edges swapped and flipped.',
      },
    ],
  },
};
