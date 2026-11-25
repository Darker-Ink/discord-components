import { createContext, useContext, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react';

interface HeadingLevelState {
  // Returns the level and records that a heading used it, so nested sections go one level deeper.
  getLevelAndMarkUsed: () => number;
  consumed: { current: boolean };
  level: number;
}

const createHeadingLevel = (level: number, consumed: { current: boolean }): HeadingLevelState => ({
  getLevelAndMarkUsed: () => {
    consumed.current = true;
    return level;
  },
  consumed,
  level,
});

export const HeadingLevelContext = createContext<HeadingLevelState>(createHeadingLevel(2, { current: false }));

HeadingLevelContext.displayName = 'HeadingLevelContext';

export const useHeadingLevel = () => useContext(HeadingLevelContext).getLevelAndMarkUsed();

export interface HeadingLevelProps {
  // Rendered at the current level (e.g. a section title); `children` then get the next level.
  component?: ReactNode;
  forceLevel?: number;
  children?: ReactNode;
}

// Starts a section: headings inside it are one level below the heading that introduced it.
export const HeadingLevel = ({ component, children, forceLevel }: HeadingLevelProps) => {
  const parent = useContext(HeadingLevelContext);
  const level = forceLevel ?? parent.level;
  let childLevel = level;
  if (component != null || (forceLevel == null && parent.consumed.current)) childLevel++;
  // Mutable boxes rather than refs: headings mark them as used while rendering.
  const [componentConsumed] = useState(() => ({ current: false }));
  const [childrenConsumed] = useState(() => ({ current: false }));
  const componentValue = useMemo(() => createHeadingLevel(level, componentConsumed), [level, componentConsumed]);
  const childrenValue = useMemo(() => createHeadingLevel(childLevel, childrenConsumed), [childLevel, childrenConsumed]);
  return (
    <>
      {component != null ? (
        <HeadingLevelContext.Provider value={componentValue}>{component}</HeadingLevelContext.Provider>
      ) : null}
      <HeadingLevelContext.Provider value={childrenValue}>{children}</HeadingLevelContext.Provider>
    </>
  );
};

HeadingLevel.displayName = 'HeadingLevel';

// A heading element (h1–h6) at the current level.
export const H = (props: HTMLAttributes<HTMLHeadingElement>) => {
  const level = useHeadingLevel();
  const Tag = `h${Math.min(level, 6)}` as 'h1';
  return <Tag {...(level > 6 ? { 'data-excessive-heading-level': level } : {})} {...props} />;
};

H.displayName = 'H';
