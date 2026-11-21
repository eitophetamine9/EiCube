export interface VideoTutorial {
  puzzleId: '3x3' | '2x2' | '4x4' | 'pyraminx';
  title: string;
  creator: string;
  videoId: string;
  duration: string;
  views: string;
  description: string;
  chapters: { time: string; title: string; seconds: number }[];
}

export const PUZZLE_VIDEOS: Record<string, VideoTutorial[]> = {
  '3x3': [
    {
      puzzleId: '3x3',
      title: 'How to Solve a Rubik\'s Cube (Beginner Tutorial)',
      creator: 'J Perm',
      videoId: '7Ron6MN45LY',
      duration: '10:04',
      views: '45M+ views',
      description: 'The world\'s most popular beginner tutorial by J Perm. Breaks the 3x3 solve into 7 intuitive, memorable steps with zero unnecessary algorithms.',
      chapters: [
        { time: '0:00', title: 'Introduction & Cube Basics', seconds: 0 },
        { time: '1:16', title: 'Step 1: The White Cross (Daisy)', seconds: 76 },
        { time: '2:40', title: 'Step 2: First Layer Corners', seconds: 160 },
        { time: '4:15', title: 'Step 3: Second Layer Edges', seconds: 255 },
        { time: '5:50', title: 'Step 4: The Yellow Cross', seconds: 350 },
        { time: '6:52', title: 'Step 5: Yellow Edges Permutation', seconds: 412 },
        { time: '7:48', title: 'Step 6: Yellow Corners Positioning', seconds: 468 },
        { time: '8:45', title: 'Step 7: Final Corner Orientation', seconds: 525 },
      ],
    },
    {
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
    {
      puzzleId: '3x3',
      title: 'How to Solve a Rubik\'s Cube | WIRED',
      creator: 'WIRED (Tyson Mao)',
      videoId: 'R-R0KrXvWbc',
      duration: '18:41',
      views: '16M+ views',
      description: 'Former World Rubik\'s Cube Association co-founder Tyson Mao explains the mathematical and physical logic behind solving the 3x3 Rubik\'s cube layer by layer.',
      chapters: [
        { time: '0:00', title: 'Structure of the Cube', seconds: 0 },
        { time: '2:10', title: 'Building the Cross', seconds: 130 },
        { time: '6:30', title: 'Solving Corners', seconds: 390 },
        { time: '10:15', title: 'Middle Layer', seconds: 615 },
        { time: '14:20', title: 'Last Layer', seconds: 860 },
      ],
    },
  ],
  '2x2': [
    {
      puzzleId: '2x2',
      title: 'How to Solve a 2x2 Rubik\'s Cube',
      creator: 'J Perm',
      videoId: 'GANnG5a19kg',
      duration: '7:42',
      views: '12M+ views',
      description: 'Master the 2x2 Pocket Cube using the beginner method and Ortega introduction. Learn how to solve the first layer, orient the top, and permute both layers.',
      chapters: [
        { time: '0:00', title: '2x2 Overview & Inspection', seconds: 0 },
        { time: '1:05', title: 'Step 1: White Face', seconds: 65 },
        { time: '2:50', title: 'Step 2: Yellow OLL', seconds: 170 },
        { time: '4:30', title: 'Step 3: PBL (Permute Both Layers)', seconds: 270 },
      ],
    },
    {
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
  ],
  '4x4': [
    {
      puzzleId: '4x4',
      title: 'How to Solve a 4x4 Rubik\'s Cube (Yau Method)',
      creator: 'J Perm',
      videoId: 'KWOZHbDdOeo',
      duration: '15:20',
      views: '8M+ views',
      description: 'Comprehensive Yau & Reduction method tutorial. Covers center reduction, 3-2-2-2 edge pairing, 3x3 stage, and both OLL and PLL parity algorithms.',
      chapters: [
        { time: '0:00', title: '4x4 Architecture & Differences', seconds: 0 },
        { time: '1:30', title: 'First 2 Opposite Centers', seconds: 90 },
        { time: '3:50', title: '3 Cross Edges', seconds: 230 },
        { time: '6:10', title: 'Last 4 Centers', seconds: 370 },
        { time: '8:40', title: 'Edge Pairing (3-2-2-2)', seconds: 520 },
        { time: '11:15', title: 'OLL Parity Algorithm', seconds: 675 },
        { time: '13:30', title: 'PLL Parity Algorithm', seconds: 810 },
      ],
    },
    {
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
  ],
  'pyraminx': [
    {
      puzzleId: 'pyraminx',
      title: 'How to Solve a Pyraminx (Beginner Tutorial)',
      creator: 'ParadoxCubing',
      videoId: 'sCJcd6FKWAc',
      duration: '8:30',
      views: '10M+ views',
      description: 'The easiest and most popular way to solve the Pyraminx! Learn corner tip alignment, first face center pairing, and intuitive last layer edge cycles.',
      chapters: [
        { time: '0:00', title: 'Pyraminx Structure & Tips', seconds: 0 },
        { time: '1:10', title: 'Step 1: Aligning the 4 Tips', seconds: 70 },
        { time: '2:00', title: 'Step 2: First Face Centers', seconds: 120 },
        { time: '3:15', title: 'Step 3: Bottom Layer Edges', seconds: 195 },
        { time: '4:40', title: 'Step 4: Last Layer Edge Cycles', seconds: 280 },
      ],
    },
    {
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
  ],
};
