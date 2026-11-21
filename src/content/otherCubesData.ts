export interface PuzzleGuide {
  id: string;
  name: string;
  category: '3x3' | '2x2' | '4x4' | 'pyraminx';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  summary: string;
  steps: {
    title: string;
    description: string;
    recognition: string;
    algorithms: {
      name: string;
      notation: string;
      desc: string;
    }[];
  }[];
}

export const OTHER_CUBES_GUIDES: Record<string, PuzzleGuide> = {
  '3x3': {
    id: '3x3',
    name: "3x3 Rubik's Cube",
    category: '3x3',
    difficulty: 'Beginner',
    summary:
      'The original and most iconic 3D twisty puzzle invented by Ernő Rubik in 1974. Mastered using the 7-step Layer-by-Layer beginner method or the competitive CFOP speedsolving system.',
    steps: [
      {
        title: 'Step 1: The White Cross',
        description: 'Build a white plus on the bottom face with each white edge side color matching its adjacent side center.',
        recognition: 'Bring edges to top daisy or insert directly.',
        algorithms: [
          { name: 'Flip Inverted Edge', notation: "F' U' R U", desc: 'Flips front edge so white faces the right direction.' },
        ],
      },
      {
        title: 'Step 2: First Layer Corners',
        description: 'Insert all 4 white corners between matching colored centers using sexy move triggers.',
        recognition: 'Position corner directly above target slot.',
        algorithms: [
          { name: 'Right-Hand Sexy Move', notation: "R U R' U'", desc: 'Inserts corner into bottom right slot.' },
        ],
      },
      {
        title: 'Step 3: Middle Layer Edges',
        description: 'Insert the 4 equator edges without disturbing the white first layer.',
        recognition: 'Match front edge color to form a vertical T.',
        algorithms: [
          { name: 'Insert Right', notation: "U R U' R' U' F' U F", desc: 'Moves top-front edge to front-right slot.' },
          { name: 'Insert Left', notation: "U' L' U L U F U' F'", desc: 'Moves top-front edge to front-left slot.' },
        ],
      },
      {
        title: 'Step 4: Yellow Cross & Final Corners',
        description: 'Orient top yellow edges into a cross and twist the final yellow corners to complete the puzzle.',
        recognition: 'Line or angle case -> Sune -> Niklas -> (R\' D\' R D).',
        algorithms: [
          { name: 'Yellow Cross Line', notation: "F R U R' U' F'", desc: 'Creates yellow cross.' },
          { name: 'Niklas Corner Permutation', notation: "U R U' L' U R' U' L", desc: 'Cycles top corners.' },
        ],
      },
    ],
  },
  '2x2': {
    id: '2x2',
    name: '2x2 Pocket Cube',
    category: '2x2',
    difficulty: 'Beginner',
    summary:
      'The 2x2 cube has 8 corners and no edge or center pieces. The Ortega and Layer-by-Layer methods are the most popular approaches, capable of solving the cube in under 4 seconds.',
    steps: [
      {
        title: 'Step 1: Solve First Face (White)',
        description:
          'Solve any face completely (traditionally White). Unlike a 3x3, in the Ortega method the side colors of the first face do NOT need to match! Just get all 4 white stickers facing one side.',
        recognition: 'Look for pieces with white. Insert them using simple sexy move triggers.',
        algorithms: [
          {
            name: 'Corner Insertion Trigger',
            notation: "R U R' U'",
            desc: 'Repeated 1 to 3 times to orient and insert a white corner.',
          },
        ],
      },
      {
        title: 'Step 2: Orient Opposite Face (Yellow OLL)',
        description:
          'Orient all 4 yellow stickers on the opposite face in one look. There are only 7 OLL cases.',
        recognition:
          'Identify how many yellow corners face Up: 0 (H or Pi), 1 (Sune or Anti-Sune), or 2 (T, U, or L).',
        algorithms: [
          {
            name: 'Sune (1 yellow up, clockwise)',
            notation: "R U R' U R U2 R'",
            desc: 'Hold the solved yellow corner in front-left.',
          },
          {
            name: 'Anti-Sune (1 yellow up, counter-clockwise)',
            notation: "R U2 R' U' R U' R'",
            desc: 'Hold the solved yellow corner in front-right.',
          },
          {
            name: 'Headlights (T Case - 2 yellow up)',
            notation: "(R U R' U') (R' F R F')",
            desc: 'Sexy move into sledgehammer.',
          },
        ],
      },
      {
        title: 'Step 3: Permute Both Layers (PBL)',
        description:
          'Permute both layers simultaneously to finish the puzzle. There are only 5 possible cases: bar on top and bottom, bar only on top, bar only on bottom, or no bars (diagonals).',
        recognition:
          'Inspect the sides of both layers for matching color pairs (bars). Match them up and run the appropriate PBL.',
        algorithms: [
          {
            name: 'Adjacent Swap Top, Solved Bottom (T-Perm)',
            notation: "R U R' U' R' F R2 U' R' U' R U R' F'",
            desc: 'Swaps the two adjacent front-right corners on the top layer.',
          },
          {
            name: 'Diagonal Swap Top, Solved Bottom (Y-Perm)',
            notation: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
            desc: 'Swaps diagonally opposite corners.',
          },
          {
            name: 'Double Diagonal Swap (Both Layers)',
            notation: "R2 F2 R2",
            desc: 'Swaps diagonal corners on both top and bottom layers.',
          },
        ],
      },
    ],
  },
  '4x4': {
    id: '4x4',
    name: "4x4 Rubik's Revenge",
    category: '4x4',
    difficulty: 'Intermediate',
    summary:
      'The 4x4 has no fixed centers and 24 edge pieces (12 pairs). The standard Yau/Reduction method reduces the 4x4 into a standard 3x3, followed by solving two unique parity cases.',
    steps: [
      {
        title: 'Step 1: First Two Opposite Centers',
        description:
          'Build the White center (2x2 block) and the opposite Yellow center. Remember the standard color scheme: White opposite Yellow, Green opposite Blue, Red opposite Orange.',
        recognition: 'Group center pieces into 1x2 bars, then pair two bars together into a 2x2 center.',
        algorithms: [
          {
            name: 'Half-Turn Center Insertion',
            notation: "Rw U Rw'",
            desc: 'Brings an edge-center piece into the top center without breaking the bottom center.',
          },
        ],
      },
      {
        title: 'Step 2: Solve the 3 White Cross Edges',
        description:
          'Pair 3 of the 4 white cross edges and place them in their bottom positions around the white center. This leaves free slices for solving the remaining 4 centers.',
        recognition: 'Find two matching white edge pieces on opposite sides of the equator.',
        algorithms: [
          {
            name: 'Edge Slice-Flip-Slice',
            notation: "Uw' (R U R' F R' F' R) Uw",
            desc: 'Standard freeslice edge pairing algorithm.',
          },
        ],
      },
      {
        title: 'Step 3: Solve the Last 4 Centers & Edges',
        description:
          'Solve the remaining 4 centers (Green, Red, Blue, Orange) in proper order, then complete all 12 edge pairs using 3-2-2-2 pairing.',
        recognition: 'Verify color order: White on bottom, Green front, Red right, Blue back, Orange left.',
        algorithms: [
          {
            name: 'Commutator Center Swap',
            notation: "Rw U Rw' U Rw U2 Rw'",
            desc: 'Swaps center bars between front and top without destroying side centers.',
          },
        ],
      },
      {
        title: 'Step 4: Solve like 3x3 & Parity Cases',
        description:
          'Once all centers and edge pairs are reduced, solve the cube just like a 3x3. On a 4x4, there is a 50% chance of encountering OLL Parity (flipped edge pair) and a 50% chance of PLL Parity (two swapped edges).',
        recognition:
          'OLL Parity: Exactly one edge pair is flipped on the yellow cross. PLL Parity: Only two opposite or adjacent edges are swapped in the last layer.',
        algorithms: [
          {
            name: 'OLL Parity (Flipped Edge Pair)',
            notation: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'",
            desc: 'Flips the front-top edge pair in place. Essential algorithm for 4x4 speedsolving.',
          },
          {
            name: 'PLL Parity (Opposite Edge Swap)',
            notation: "2R2 U2 2R2 Uw2 2R2 Uw2",
            desc: 'Swaps opposite edge pairs on the top layer to complete the solve.',
          },
        ],
      },
    ],
  },
  pyraminx: {
    id: 'pyraminx',
    name: 'Pyraminx (Tetrahedron)',
    category: 'pyraminx',
    difficulty: 'Beginner',
    summary:
      'The Pyraminx is a regular tetrahedron puzzle with 4 faces and 4 movable tips. It has only 933,120 possible positions and can be solved intuitively in 10 to 15 moves using the V-First method.',
    steps: [
      {
        title: 'Step 1: Orient the 4 Tips',
        description:
          'The 4 corner tips (u, l, r, b) rotate independently in place. Simply twist each tip so its 3 colors match its adjacent center piece.',
        recognition: 'Inspect each of the 4 tips. A single twist in either direction aligns them.',
        algorithms: [
          {
            name: 'Tip Alignment',
            notation: "u l r b",
            desc: 'Twist each tip to match its center.',
          },
        ],
      },
      {
        title: 'Step 2: Solve the 3 First-Face Centers',
        description:
          'Choose a starting color (commonly Yellow or Green). Rotate the axes so all 3 center axial pieces on that face share that color, forming a radioactive hazard / biohazard symbol.',
        recognition: 'Find the vertex where yellow is NOT present. The opposite face must be the yellow face!',
        algorithms: [
          {
            name: 'Center Alignment',
            notation: "U L R",
            desc: 'Rotate layers until all 3 centers match on the bottom face.',
          },
        ],
      },
      {
        title: 'Step 3: Insert the First Layer Edges (The V)',
        description:
          'Insert the 3 bottom-face edge pieces into their correct slots to complete the bottom face and first layer.',
        recognition: 'Hold the yellow face on the bottom. Locate yellow edges in the top layer.',
        algorithms: [
          {
            name: 'Sledgehammer (Right Insert)',
            notation: "R' L R L'",
            desc: 'Inserts the top-front edge into the front-right slot.',
          },
          {
            name: 'Hedgeslammer (Left Insert)',
            notation: "L R' L' R",
            desc: 'Mirrored insert for the left slot.',
          },
        ],
      },
      {
        title: 'Step 4: Solve the Last Layer Edges',
        description:
          'Only 3 edges remain on the last layer! Identify whether they need a 3-cycle or an in-place edge flip.',
        recognition:
          'Look at the 3 remaining edges. If all 3 are in the wrong spots, cycle them with Sune. If 2 edges are in the right spot but flipped, use the 2-edge flip.',
        algorithms: [
          {
            name: 'Last Layer 3-Cycle (Sune)',
            notation: "R U R' U R U R'",
            desc: 'Cycles the three top edges clockwise without disturbing the bottom layer.',
          },
          {
            name: 'Flip Two Adjacent Edges',
            notation: "(R' L R L') U (L' U' L)",
            desc: 'Sledgehammer followed by U and left corner insert.',
          },
        ],
      },
    ],
  },
};
