import { createContext, useContext, type ReactNode } from 'react';
import { I18nProvider } from 'react-aria-components';
import { ThemeTypes, type Theme } from '@discord-mana/tokens';

// Strings Mana components render on their own. Discord's client fills these from its translations.
export const DEFAULT_MANA_I18N = {
  CANCEL: 'Cancel',
  BACK: 'Back',
  NEXT: 'Next',
  SUBMIT: 'Submit',
  SPINNER_LOADING_LABEL: 'Loading',
  BUTTON_LOADING_STARTED_LABEL: 'Loading',
  BUTTON_LOADING_FINISHED_LABEL: 'Loading',
  CLOSE_BUTTON_LABEL: 'Close',
  DISMISS_BUTTON_LABEL: 'Dismiss',
  PLAY_BUTTON_LABEL: 'Play',
  PAUSE_BUTTON_LABEL: 'Pause',
  NEW: 'New',
  BETA: 'Beta',
  EARLY_ACCESS: 'Early Access',
  BILLING_TRIAL_FREE_TRIAL_TEXT: 'Free Trial',
  MODAL_DONT_SHOW_AGAIN: "Don't show again",
  SEARCH: 'Search',
  AUTOCOMPLETE_NO_RESULTS_HEADER: 'Nope!',
  AUTOCOMPLETE_NO_RESULTS_BODY: 'Did you make a typo?',
  LISTBOX_EMPTY_STATE: 'No items to show',
  LISTBOX_EMPTY_STATE_WITH_QUERY: (query: string) => `No results for ‘${query}’`,
  KEY_CTRL_A11Y_LABEL: 'Ctrl',
  KEY_CMD_A11Y_LABEL: 'Cmd',
  KEY_ALT_A11Y_LABEL: 'Alt',
  KEY_OPTION_A11Y_LABEL: 'Option',
  KEY_SHIFT_A11Y_LABEL: 'Shift',
  KEY_UP_A11Y_LABEL: 'Up',
  KEY_DOWN_A11Y_LABEL: 'Down',
  KEY_LEFT_A11Y_LABEL: 'Left',
  KEY_RIGHT_A11Y_LABEL: 'Right',
  KEY_PAGEUP: 'Page Up',
  KEY_PAGEDOWN: 'Page Down',
  KEY_ANY: 'Any',
  KEY_ENTER: 'Enter',
  KEY_ENTER_A11Y_LABEL: 'Enter',
  KEY_RETURN_A11Y_LABEL: 'Return',
  KEY_ESCAPE: 'Escape',
  KEY_ESCAPE_A11Y_LABEL: 'Escape',
  KEY_BACKSPACE: 'Backspace',
  KEY_BACKSPACE_A11Y_LABEL: 'Backspace',
  KEY_DELETE_A11Y_LABEL: 'Delete',
  KEY_SHIFT: 'Shift',
  DATE_INPUT_OPEN_CALENDAR_LABEL: 'Open calendar',
  CALENDAR_PREVIOUS_MONTH_LABEL: 'Previous month',
  CALENDAR_NEXT_MONTH_LABEL: 'Next month',
  INLINE_NOTICE_GENERIC_ERROR: 'Something went wrong. Please try again later.',
  FEEDBACK_CRITICAL_ICON_A11Y_LABEL: 'Error',
  FEEDBACK_WARNING_ICON_A11Y_LABEL: 'Warning',
  FEEDBACK_INFO_ICON_A11Y_LABEL: 'Info',
  FEEDBACK_POSITIVE_ICON_A11Y_LABEL: 'Success',
  STEP_INDICATOR: (stepNumber: number, stepCount: number) => `Step ${stepNumber} of ${stepCount}`,
  SELECT_PLACEHOLDER: 'Select...',
  CLEAR_SELECTION: 'Clear',
  SELECTED_TAGS_HEADING: 'Selected',
  PRESS_DELETE_TO_REMOVE_TAG: 'Press Delete to remove tag',
  PERCENT_COMPLETE: (percent: number) => `${percent} percent complete`,
  TEXT_INPUT_CLEAR: 'Clear',
  TEXT_INPUT_VIEW_PASSWORD: 'View Password',
  TEXT_INPUT_HIDE_PASSWORD: 'Hide Password',
  TEXT_INPUT_PASSWORD_VISIBLE: 'Password is visible.',
  TEXT_INPUT_PASSWORD_HIDDEN: 'Password is hidden.',
  CHARACTER_COUNT_LIMIT_REACHED: 'Character limit reached',
  CHARACTER_COUNT_A11Y_LABEL: (remaining: number) =>
    `Character count, ${remaining} ${remaining === 1 ? 'character' : 'characters'} remaining`,
  MINIMUM_LENGTH_ERROR: (length: number) => `Must be ${length} characters or more in length.`,
  MAXIMUM_LENGTH_ERROR: (length: number) => `Must be ${length} characters or fewer in length.`,
  MINIMUM_VALUE_ERROR: (value: number) => `Must be ${value} or more.`,
  MAXIMUM_VALUE_ERROR: (value: number) => `Must be ${value} or less.`,
  GLOBAL_BANNER_COUNTDOWN_TIME_LEFT: (time: string) => `${time} left`,
};

export type ManaI18n = typeof DEFAULT_MANA_I18N;

export interface ManaImpression {
  componentName: string;
  // Shape depends on the component reporting it; Discord forwards it to its analytics.
  payload: Record<string, unknown>;
}

export interface ManaContextValue {
  i18n: ManaI18n;
  theme: Theme;
  locale: string;
  saturation: number;
  // App-specific hooks into Discord's client (layers, analytics, window state, dynamic graphics).
  defaultLayerContext?: unknown;
  trackImpression?: (impression: ManaImpression) => void;
  isWindowFocused?: () => boolean;
  isMainWindowVisible?: () => boolean;
  dynamicGraphicComponents?: unknown;
}

export const DEFAULT_MANA_CONTEXT: ManaContextValue = {
  i18n: DEFAULT_MANA_I18N,
  theme: ThemeTypes.LIGHT,
  locale: 'en-US',
  saturation: 0.5,
  defaultLayerContext: undefined,
  trackImpression: undefined,
  isWindowFocused: undefined,
  isMainWindowVisible: undefined,
  dynamicGraphicComponents: undefined,
};

export const ManaContext = createContext<ManaContextValue>(DEFAULT_MANA_CONTEXT);

ManaContext.displayName = 'ManaContext';

export const useManaContext = () => useContext(ManaContext);

export interface ManaContextProviderProps {
  value: ManaContextValue;
  children?: ReactNode;
}

export const ManaContextProvider = ({ value, children }: ManaContextProviderProps) => (
  <ManaContext.Provider value={value}>
    <I18nProvider locale={value.locale}>{children}</I18nProvider>
  </ManaContext.Provider>
);

ManaContextProvider.displayName = 'ManaContextProvider';
