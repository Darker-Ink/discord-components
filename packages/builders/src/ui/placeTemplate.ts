import {
  canInsert,
  isTemplateAllowed,
  type BuilderActions,
  type BuilderDocument,
  type BuilderRestrictions,
  type NodeTarget,
  type TemplateType,
} from '../core';

// Buttons and select menus only live in action rows. Dropped (or added) where only a row could go, they bring
// their row with them, so "add a button" works on an empty message too.
const NEEDS_ROW: ReadonlySet<string> = new Set([
  'button',
  'link-button',
  'premium-button',
  'string-select',
  'user-select',
  'role-select',
  'mentionable-select',
  'channel-select',
]);

const wraps = (
  doc: BuilderDocument,
  template: TemplateType,
  target: NodeTarget,
  restrictions: BuilderRestrictions | undefined,
) =>
  NEEDS_ROW.has(template) &&
  !canInsert(doc, template, target, { restrictions }) &&
  canInsert(doc, 'action-row', target, { restrictions }) &&
  isTemplateAllowed(template, restrictions);

/** Whether a template can go to a target, directly or in a new action row. */
export const canPlace = (
  doc: BuilderDocument,
  template: TemplateType,
  target: NodeTarget,
  restrictions?: BuilderRestrictions,
) => canInsert(doc, template, target, { restrictions }) || wraps(doc, template, target, restrictions);

/** Inserts a template at a target (in a new action row when it needs one); returns the new node's uid. */
export const placeTemplate = (
  actions: BuilderActions,
  doc: BuilderDocument,
  template: TemplateType,
  target: NodeTarget,
  restrictions?: BuilderRestrictions,
): string | null => {
  if (!wraps(doc, template, target, restrictions))
    return actions.insert(target.parentId, target.slot, target.index ?? -1, template);
  return actions.batch(() => {
    const row = actions.insert(target.parentId, target.slot, target.index ?? -1, 'action-row');
    return row != null ? actions.insert(row, 'components', -1, template) : null;
  });
};
