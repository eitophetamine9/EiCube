import { CubeState } from './cube/CubeState';
import { RubiksCubeScene } from './render/RubiksCubeScene';
import { TabManager } from './ui/tabs';
import { ControlsManager } from './ui/controls';
import { GuideRenderer } from './ui/guideRenderer';
import { SettingsManager } from './ui/settings';
import { TutorialOverlay } from './ui/tutorial';
import { TipsModal } from './ui/tipsModal';
import { OtherCubesManager } from './ui/otherCubes';
import { parseAlgorithm } from './cube/notation';
import { toast } from './ui/toast';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Logical Cube State
  const cubeState = new CubeState(3);

  // 2. Containers
  const viewportContainer = document.getElementById('cube-viewport-container') as HTMLElement;
  const controlsMount = document.getElementById('controls-mount') as HTMLElement;
  const otherMount = document.getElementById('other-mount') as HTMLElement;
  const guideMount = document.getElementById('guide-mount') as HTMLElement;

  if (!viewportContainer || !controlsMount || !otherMount || !guideMount) {
    console.error('Critical container element missing');
    return;
  }

  // 3. Initialize 3D Scene for 3x3
  let controls: ControlsManager;
  const scene = new RubiksCubeScene(viewportContainer, cubeState, {
    onSolvedChange: (isSolved) => {
      controls?.updateSolvedState(isSolved);
    },
    onMoveExecuted: (notation) => {
      controls?.recordMove(notation);
    },
  });

  // 4. Initialize Settings Manager
  const settings = new SettingsManager(() => {
    controls?.refreshKeybindLabels();
  });

  // 5. Initialize Controls UI
  controls = new ControlsManager(controlsMount, scene, settings);

  // 6. Initialize Tabs
  const tabManager = new TabManager((tab) => {
    if (tab === 'cube') {
      window.dispatchEvent(new Event('resize'));
    }
  });

  // 7. Initialize Other Cubes (2x2, 4x4, Pyraminx)
  new OtherCubesManager(otherMount);

  // 8. Initialize Guide UI
  new GuideRenderer(guideMount, (notation) => {
    // Switch to cube tab
    tabManager.setTab('cube');

    // Parse and run algorithm on the 3D scene
    const moves = parseAlgorithm(notation);
    if (moves.length > 0) {
      toast.show(`Running: ${notation}`);
      scene.executeAlgorithm(moves, false, false, () => {
        toast.show(`Completed: ${notation}`);
      });
    }
  });

  // 9. Onboarding & Tips Modals
  const tutorial = new TutorialOverlay();
  const tipsModal = new TipsModal((stepId) => {
    tabManager.setTab('learn');
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

  // 10. Global Keyboard Listener for Cube Moves
  window.addEventListener('keydown', (e) => {
    // If typing in input, textarea, or any modal is open, ignore
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

    // Only handle cube keyboard shortcuts if on Cube tab
    if (tabManager.getActiveTab() !== 'cube') return;

    // Check bound keys
    const keybinds = settings.getKeybinds();
    const action = Object.keys(keybinds).find((act) => keybinds[act] === e.code);

    if (action) {
      e.preventDefault();

      let move = action;
      if (action.endsWith("'")) {
        // Direct prime binding (e.g. user assigned dedicated key for R')
        move = action;
      } else if (e.shiftKey) {
        move += "'";
      } else if (e.altKey || e.ctrlKey) {
        move += '2';
      }

      // Execute view-relative move!
      controls.executeMove(move, true);
    }
  });
});
