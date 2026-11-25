import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type RichTooltipPadding = 'default' | 'lg';

interface RichTooltipContextValue {
  isRichTooltip: boolean;
  richTooltipPadding?: RichTooltipPadding;
}

const RichTooltipContext = createContext<RichTooltipContextValue>({ isRichTooltip: false });

RichTooltipContext.displayName = 'RichTooltipContext';

export const RichTooltipProvider = ({
  children,
  isRichTooltip = false,
  richTooltipPadding,
}: {
  children?: ReactNode;
  isRichTooltip?: boolean;
  richTooltipPadding?: RichTooltipPadding;
}) => {
  const value = useMemo(() => ({ isRichTooltip, richTooltipPadding }), [isRichTooltip, richTooltipPadding]);
  return <RichTooltipContext.Provider value={value}>{children}</RichTooltipContext.Provider>;
};

RichTooltipProvider.displayName = 'RichTooltipProvider';

export const useRichTooltipContext = () => useContext(RichTooltipContext);
