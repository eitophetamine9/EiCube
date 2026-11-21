import { CubeState } from './cube/CubeState';
import { RubiksCubeScene } from './render/RubiksCubeScene';
import { PyraminxScene } from '../src/render/PyraminxScene';
import { TabManager } from './ui/tabs';
import { ControlsManager, TrainerPuzzleType } from './ui/controls';
import { GuideRenderer } from './ui/guideRenderer';
import { SettingsManager } from './ui/settings';
import { TutorialOverlay } from './ui/tutorial';
import { TipsModal } from './ui/tipsModal';
import { OtherCubesManager } from './ui/otherCubes';
import { parseAlgorithm } from './cube/notation';
import { toast } from './ui/toast';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Containers
  const viewportContainer = document.getElementById('cube-viewport-container') as HTMLElement;
  const controlsMount = document.getElementById('controls-mount') as HTMLElement;
  const otherMount = document.getElementById('other-mount') as HTMLElement;
  const guideMount = document.getElementById('guide-mount') as HTMLElement;

  if (!viewportContainer || !controlsMount || !otherMount || !guideMount) {
    console.error('Critical container element missing');
    return;
  }

  // 2. Initialize 3D Scenes for Trainer Viewport
  const cubeState = new CubeState(3);
  let controls: ControlsManager;
  let pyraScene: PyraminxScene | null = null;

  const cubeScene = new RubiksCubeScene(viewportContainer, cubeState, {
    onSolvedChange: (isSolved) => {
      controls?.updateSolvedState(isSolved);
    },
    onMoveExecuted: (notation) => {
      controls?.recordMove(notation);
    },
  });

  // Switch puzzle helper in Trainer
  const switchTrainerPuzzle = (puzzle: TrainerPuzzleType) => {
    if (puzzle === 'pyraminx') {
      // Hide cube canvas
      cubeScene['renderer'].domElement.style.display = 'none';

      if (!pyraScene) {
        pyraScene = new PyraminxScene(viewportContainer, {
          onSolvedChange: (isSolved) => {
            controls?.updateSolvedState(isSolved);
          },
          onMoveExecuted: (notation) => {
            controls?.recordMove(notation);
          },
        });
      } else {
        pyraScene['renderer'].domElement.style.display = 'block';
        pyraScene.reset();
      }
    } else {
      // Hide pyraminx canvas if active
      if (pyraScene) {
        pyraScene['renderer'].domElement.style.display = 'none';
      }
      cubeScene['renderer'].domElement.style.display = 'block';

      const size = puzzle === '2x2' ? 2 : puzzle === '4x4' ? 4 : 3;
      cubeScene.setSize(size);
    }
  };

  // 3. Settings Manager
  const settings = new SettingsManager(() => {
    controls?.refreshKeybindLabels();
  });

  // 4. Controls UI
  controls = new ControlsManager(controlsMount, cubeScene, settings, {
    onPuzzleChange: (puzzle) => {
      switchTrainerPuzzle(puzzle);
    },
    onExecuteMoveDirect: (move, isScramble) => {
      if (move === 'RESET') {
        pyraScene?.reset();
      } else {
        pyraScene?.executeMove(move, isScramble);
      }
    },
    onSpeedChange: (val) => {
      pyraScene?.setSpeed(val);
    },
  });

  // 5. Tab Manager
  const tabManager = new TabManager((tab) => {
    if (tab === 'cube') {
      window.dispatchEvent(new Event('resize'));
    }
  });

  // 6. Other Puzzles Tab Manager with "Solve this version" button support!
  const otherCubes = new OtherCubesManager(otherMount, {
    onSolveVersion: (puzzle) => {
      controls.setTrainerPuzzle(puzzle);
      switchTrainerPuzzle(puzzle);
      tabManager.setTab('cube');
      toast.show(`Loaded ${puzzle} into Puzzle Trainer!`);
    },
  });
  void otherCubes;

  // 7. Learn Puzzles Guide UI with Video Tutorials
  const guideRenderer = new GuideRenderer(guideMount, (notation, category) => {
    // Switch to trainer and load that puzzle!
    controls.setTrainerPuzzle(category);
    switchTrainerPuzzle(category);
    tabManager.setTab('cube');

    if (category === 'pyraminx') {
      const tokens = notation.split(/[\s()]+/).filter(Boolean);
      tokens.forEach((t) => pyraScene?.executeMove(t));
      toast.show(`Ran algorithm on Pyraminx: ${notation}`);
    } else {
      const moves = parseAlgorithm(notation);
      if (moves.length > 0) {
        toast.show(`Running: ${notation}`);
        cubeScene.executeAlgorithm(moves, false, false, () => {
          toast.show(`Completed: ${notation}`);
        });
      }
    }
  });

  // 8. Onboarding & Tips Modals
  const tutorial = new TutorialOverlay();
  const tipsModal = new TipsModal((stepId) => {
    tabManager.setTab('learn');
    guideRenderer.setCategory('3x3');
    setTimeout(() => {
      const stepEl = document.getElementById(stepId);
      stepEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  });

  // Header Buttons
  document.getElementById('btn-open-tips')?.addEventListener('click', () => {
    tipsModal.open();
  });

  document.getElementById('btn-open-help')?.addEventListener('click', () => {
    tutorial.open();
  });

  document.getElementById('btn-open-settings')?.addEventListener('click', () => {
    settings.open();
  });

  // 9. Global Keyboard Listener for Cube Moves
  window.addEventListener('keydown', (e) => {
    if (settings.isOpen() || tipsModal.isOpen()) return;

    const target = e.target as HTMLElement;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }

    // Only handle keyboard shortcuts if on Puzzle Trainer tab
    if (tabManager.getActiveTab() !== 'cube') return;

    // Check bound keys
    const keybinds = settings.getKeybinds();
    const action = Object.keys(keybinds).find((act) => keybinds[act] === e.code);

    if (action) {
      e.preventDefault();

      let move = action;
      if (action.endsWith("'")) {
        move = action;
      } else if (e.shiftKey) {
        move += "'";
      } else if (e.altKey || e.ctrlKey) {
        move += '2';
      }

      controls.executeMove(move, true);
    }
  });
});
