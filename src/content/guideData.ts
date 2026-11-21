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
