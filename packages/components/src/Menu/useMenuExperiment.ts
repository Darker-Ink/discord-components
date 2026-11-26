import { useManaContext } from '../ManaContext';

// Discord's "2025-11-mana-context-menu" experiment restyles menus for Mana (leading accessories,
// trailing indicators, marquee labels). Here it is switched on through ManaContext's experiments.
export const MENU_EXPERIMENT = '2025-11-mana-context-menu';

// `location` names the component asking, as the client's experiment exposure tracking does.
export const useMenuExperiment = (_location: string) =>
  useManaContext().experiments?.enabledExperiments.includes(MENU_EXPERIMENT) ?? false;
