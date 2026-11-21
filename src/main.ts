import { CubeState } from './cube/CubeState';
import { RubiksCubeScene } from './render/RubiksCubeScene';
import { TabManager } from './ui/tabs';
import { ControlsManager } from './ui/controls';
import { GuideRenderer } from './ui/guideRenderer';
import { SettingsManager } from './ui/settings';
import { TutorialOverlay } from './ui/tutorial';
import { parseAlgorithm } from './cube/notation';
import { toast } from './ui/toast';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Logical Cube State
  const cubeState = new CubeState(3);

  // 2. Containers
  const viewportContainer = document.getElementById('cube-viewport-container') as HTMLElement;
  const controlsMount = document.getElementById('controls-mount') as HTMLElement;
  const guideMount = document.getElementById('guide-mount') as HTMLElement;

  if (!viewportContainer || !controlsMount || !guideMount) {
    console.error('Critical container element missing');
    return;
  }

  // 3. Initialize 3D Scene
  let controls: ControlsManager;
  const scene = new RubiksCubeScene(viewportContainer, cubeState, {
    onSolvedChange: (isSolved) => {
      controls?.updateSolvedState(isSolved);
    },
    onMoveExecuted: (notation) => {
      controls?.recordMove(notation);
    },
  });

  // 4. Initialize Controls UI
  controls = new ControlsManager(controlsMount, scene);

  // 5. Initialize Tabs
  const tabManager = new TabManager((tab) => {
    // When switching to cube tab, ensure scene resizes properly
    if (tab === 'cube') {
      window.dispatchEvent(new Event('resize'));
    }
  });

  // 6. Initialize Guide UI
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

  // 7. Settings & Tutorial Overlays
  const settings = new SettingsManager();
  const tutorial = new TutorialOverlay();

  // Header Buttons
  document.getElementById('btn-open-help')?.addEventListener('click', () => {
    tutorial.open();
  });

  document.getElementById('btn-open-settings')?.addEventListener('click', () => {
    settings.open();
  });

  // 8. Global Keyboard Listener for Cube Moves
  window.addEventListener('keydown', (e) => {
    // If typing in input, textarea, or a modal is open, ignore
    if (settings.isOpen()) return;

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
      if (e.shiftKey) {
        move += "'";
      } else if (e.altKey || e.ctrlKey) {
        move += '2';
      }

      // Execute view-relative move!
      controls.executeMove(move, true);
    }
  });
});
