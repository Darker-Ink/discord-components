import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ThemeTypes, type Theme } from '@discord-components/tokens';
import {
  AccessibilityPreferencesContext,
  AccessibilityPreferencesProvider,
  type ReducedMotionSetting,
} from '../AccessibilityPreferences';
import { FocusRingManager, FocusRingScope } from '../FocusRing';
import { appLayerContext } from '../Layer';
import { DEFAULT_MANA_CONTEXT, ManaContextProvider, type ManaContextValue } from '../ManaContext';
import { MaskLibrary } from '../Mask';
import { ModalLayerRoot } from '../ModalStack';
import { ThemeContextProvider } from '../Theme';
import { AppToastContainer } from '../Toast';
import { useRootClasses, type UIDensity } from './useRootClasses';

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

const RootElement = ({
  theme,
  saturation,
  density,
  children,
}: {
  theme: Theme;
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
  });
  return children;
};

RootElement.displayName = 'RootElement';

export interface AppRootProps {
  theme?: Theme;
  /** Follow the OS ('auto') or force reduced motion on or off. */
  reducedMotion?: ReducedMotionSetting;
  highContrastMode?: boolean;
  /** Color saturation, 0 to 1. */
  saturation?: number;
  density?: UIDensity;
  /** On/off indicators in switches. */
  switchIconsEnabled?: boolean;
  /** Merged over the Mana context AppRoot provides (strings, locale, dynamic graphic components…). */
  manaContext?: Partial<ManaContextValue>;
  children?: ReactNode;
}

// The providers Discord's client puts around everything it renders: accessibility settings, the
// Mana context (strings, theme), the theme context, the <html> classes components style against,
// a focus ring scope over the whole document and the layers overlays render in (with the modal
// stack and the app's toasts). Wrap an app in it once, at the root.
export const AppRoot = ({
  theme = ThemeTypes.DARK,
  reducedMotion = 'auto',
  highContrastMode = false,
  saturation = 1,
  density = 'default',
  switchIconsEnabled = false,
  manaContext: manaContextOverrides,
  children,
}: AppRootProps) => {
  const keyboardMode = useKeyboardMode();
  const bodyRef = useRef<Element>(document.body);
  const manaContext = useMemo(
    () => ({
      ...DEFAULT_MANA_CONTEXT,
      theme,
      saturation,
      defaultLayerContext: appLayerContext,
      ...manaContextOverrides,
    }),
    [theme, saturation, manaContextOverrides],
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
          <RootElement theme={theme} saturation={saturation} density={density}>
            <FocusRingScope containerRef={bodyRef}>
              <MaskLibrary />
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
