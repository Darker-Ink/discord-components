import { isValidElement, type ReactNode } from 'react';

// The plain text of a node, for screen reader announcements: strings and numbers, recursing into
// arrays and element children. Anything else has no text.
export const getTextContent = (node: ReactNode): string | undefined => {
  if (typeof node === 'string' || typeof node === 'number') return node.toString();
  if (Array.isArray(node)) return node.map(getTextContent).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return getTextContent(node.props.children);
  return undefined;
};
