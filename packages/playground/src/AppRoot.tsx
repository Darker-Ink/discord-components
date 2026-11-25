import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityPreferencesContext,
  AccessibilityPreferencesProvider,
  AppLayerContainer,
  AppLayerProvider,
  appLayerContext,
  DEFAULT_MANA_CONTEXT,
  FocusRingManager,
  FocusRingScope,
  ManaContextProvider,
  PopoverPortalTarget,
  ThemeContextProvider,
} from '@discord-components/components';
import type { Theme } from '@discord-components/tokens';
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
  children,
}: {
  theme: Theme;
  experiments: readonly string[];
  children: ReactNode;
}) => {
  const { reducedMotion, keyboardModeEnabled } = useContext(AccessibilityPreferencesContext);
  useRootClasses(theme, { keyboardMode: keyboardModeEnabled, reducedMotion: reducedMotion.enabled, experiments });
  return children;
};

RootElement.displayName = 'RootElement';

const CONTENTS = { display: 'contents' } as const;

// The containers the client renders after the app's content for things that float above it:
// floating layers (tooltips, FloatingLayer) portal into #popover-portal, popouts into the app layer.
const LayerContainers = () => (
  <div style={CONTENTS}>
    <div style={CONTENTS}>
      <PopoverPortalTarget />
      <AppLayerContainer />
    </div>
  </div>
);

LayerContainers.displayName = 'LayerContainers';

// The providers Discord's client puts around everything it renders: accessibility settings, the
// Mana context (strings, theme, experiments), the theme context and a focus ring scope over the whole
// document.
export const AppRoot = ({
  theme,
  experiments = NO_EXPERIMENTS,
  children,
}: {
  theme: Theme;
  experiments?: readonly string[];
  children: ReactNode;
}) => {
  const keyboardMode = useKeyboardMode();
  const bodyRef = useRef<Element>(document.body);
  const manaContext = useMemo(
    () => ({
      ...DEFAULT_MANA_CONTEXT,
      theme,
      saturation: 1,
      experiments: { enabledExperiments: [...experiments] },
      defaultLayerContext: appLayerContext,
    }),
    [theme, experiments],
  );
  return (
    <AccessibilityPreferencesProvider keyboardModeEnabled={keyboardMode}>
      <ManaContextProvider value={manaContext}>
        <ThemeContextProvider theme={theme}>
          <RootElement theme={theme} experiments={experiments}>
            <FocusRingScope containerRef={bodyRef}>
              <AppLayerProvider>
                {children}
                <LayerContainers />
              </AppLayerProvider>
            </FocusRingScope>
          </RootElement>
        </ThemeContextProvider>
      </ManaContextProvider>
    </AccessibilityPreferencesProvider>
  );
};

AppRoot.displayName = 'AppRoot';
