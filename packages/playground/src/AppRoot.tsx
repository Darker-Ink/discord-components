import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityPreferencesContext,
  AccessibilityPreferencesProvider,
  AppToastContainer,
  appLayerContext,
  DEFAULT_MANA_CONTEXT,
  FocusRingManager,
  FocusRingScope,
  ManaContextProvider,
  ModalLayerRoot,
  ThemeContextProvider,
} from '@discord-components/components';
import type { Theme } from '@discord-components/tokens';
import type { ReducedMotionSetting, UIDensity } from './appSettings';
import { dynamicGraphicComponents } from './dynamicGraphics';
import { useRootClasses } from './useRootClasses';

// Keys that switch Discord into keyboard mode (focus rings on). Outside text fields only Tab does.
const NAVIGATION_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'F6']);

const isTextField = (element: Element | null) =>
  element instanceof HTMLInputElement ||
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLElement && element.isContentEditable);

// Mirrors the client's keyboard-mode listener: navigation keys turn it on, any mouse press turns it off.
const useKeyboardMode = () => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.key !== 'Tab' && (event.shiftKey || isTextField(document.activeElement))) return;
      if (NAVIGATION_KEYS.has(event.key)) setEnabled(true);
    };
    const onMouseDown = () => setEnabled(false);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('mousedown', onMouseDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('mousedown', onMouseDown, true);
    };
  }, []);
  useEffect(() => {
    FocusRingManager.setRingsEnabled(enabled);
    if (enabled) FocusRingManager.enableAnimationTracking();
    else FocusRingManager.disableAnimationTracking();
  }, [enabled]);
  return enabled;
};

const NO_EXPERIMENTS: readonly string[] = [];

const RootElement = ({
  theme,
  experiments,
  saturation,
  density,
  children,
}: {
  theme: Theme;
  experiments: readonly string[];
  saturation: number;
  density: UIDensity;
  children: ReactNode;
}) => {
  const { reducedMotion, keyboardModeEnabled, highContrastModeEnabled } = useContext(AccessibilityPreferencesContext);
  useRootClasses(theme, {
    keyboardMode: keyboardModeEnabled,
    reducedMotion: reducedMotion.enabled,
    highContrastMode: highContrastModeEnabled,
    saturation,
    density,
    experiments,
  });
  return children;
};

RootElement.displayName = 'RootElement';

// The providers Discord's client puts around everything it renders: accessibility settings, the
// Mana context (strings, theme, experiments), the theme context, a focus ring scope over the whole
// document and the layers overlays render in (with the modal stack).
export const AppRoot = ({
  theme,
  experiments = NO_EXPERIMENTS,
  reducedMotion = 'auto',
  highContrastMode = false,
  saturation = 1,
  density = 'default',
  switchIconsEnabled = false,
  children,
}: {
  theme: Theme;
  experiments?: readonly string[];
  reducedMotion?: ReducedMotionSetting;
  highContrastMode?: boolean;
  saturation?: number;
  density?: UIDensity;
  switchIconsEnabled?: boolean;
  children: ReactNode;
}) => {
  const keyboardMode = useKeyboardMode();
  const bodyRef = useRef<Element>(document.body);
  const manaContext = useMemo(
    () => ({
      ...DEFAULT_MANA_CONTEXT,
      theme,
      saturation,
      experiments: { enabledExperiments: [...experiments] },
      defaultLayerContext: appLayerContext,
      dynamicGraphicComponents,
    }),
    [theme, saturation, experiments],
  );
  return (
    <AccessibilityPreferencesProvider
      keyboardModeEnabled={keyboardMode}
      prefersReducedMotion={reducedMotion}
      highContrastModeEnabled={highContrastMode}
      switchIconsEnabled={switchIconsEnabled}
    >
      <ManaContextProvider value={manaContext}>
        <ThemeContextProvider theme={theme}>
          <RootElement theme={theme} experiments={experiments} saturation={saturation} density={density}>
            <FocusRingScope containerRef={bodyRef}>
              <ModalLayerRoot>{children}</ModalLayerRoot>
              <AppToastContainer appContext="APP" />
            </FocusRingScope>
          </RootElement>
        </ThemeContextProvider>
      </ManaContextProvider>
    </AccessibilityPreferencesProvider>
  );
};

AppRoot.displayName = 'AppRoot';
