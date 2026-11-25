import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { FloatingPortal, type FloatingPortalProps } from '@floating-ui/react';

export const POPOVER_PORTAL_ID = 'popover-portal';

interface PopoverPortalContextValue {
  enabled: boolean;
  target: HTMLElement | null;
  registerTarget: (element: HTMLElement | null) => void;
}

const PopoverPortalContext = createContext<PopoverPortalContextValue | null>(null);

PopoverPortalContext.displayName = 'PopoverPortalContext';

export interface PopoverPortalProviderProps {
  enabled?: boolean;
  children?: ReactNode;
}

// Scopes floating layers to a PopoverPortalTarget inside it instead of the app-wide one (e.g. for
// a separate window or a fullscreen element).
export const PopoverPortalProvider = ({ children, enabled = true }: PopoverPortalProviderProps) => {
  const [target, registerTarget] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ enabled, target, registerTarget }), [enabled, target]);
  return <PopoverPortalContext.Provider value={value}>{children}</PopoverPortalContext.Provider>;
};

PopoverPortalProvider.displayName = 'PopoverPortalProvider';

// Where floating layers render. The app renders one near its root; a PopoverPortalProvider makes
// it a scoped target instead of the global #popover-portal.
export const PopoverPortalTarget = () => {
  const context = useContext(PopoverPortalContext);
  return <div id={context == null ? POPOVER_PORTAL_ID : undefined} ref={context?.registerTarget} />;
};

PopoverPortalTarget.displayName = 'PopoverPortalTarget';

export interface PopoverPortalProps extends Omit<FloatingPortalProps, 'root'> {
  ownerDocument?: Document;
}

export const PopoverPortal = ({ ownerDocument = document, ...props }: PopoverPortalProps) => {
  const context = useContext(PopoverPortalContext);
  if (context?.enabled === true && context.target == null) return null;
  const root = context?.enabled === true ? context.target : ownerDocument.getElementById(POPOVER_PORTAL_ID);
  return <FloatingPortal {...props} root={root} />;
};

PopoverPortal.displayName = 'PopoverPortal';
