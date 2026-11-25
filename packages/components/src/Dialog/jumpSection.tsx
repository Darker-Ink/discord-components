import { createContext, useContext, useMemo, type ReactNode } from 'react';

// F6 cycles focus between elements marked with this attribute; each section names its group.
export const JUMP_SECTION_ATTRIBUTE = 'data-jump-section';

export const JumpSectionContext = createContext<string>('global');

JumpSectionContext.displayName = 'JumpSectionContext';

export type JumpSectionProps = { [JUMP_SECTION_ATTRIBUTE]: string };

export const useJumpSectionProps = (): JumpSectionProps => {
  const section = useContext(JumpSectionContext);
  return useMemo(() => ({ [JUMP_SECTION_ATTRIBUTE]: section }), [section]);
};

export const JumpSection = ({ children }: { children: (props: JumpSectionProps) => ReactNode }) =>
  children(useJumpSectionProps());

JumpSection.displayName = 'JumpSection';
