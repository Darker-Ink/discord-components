import { useCallback } from 'react';
import { findNode, ROOT_UID, useBuilderSelector, type BuilderNode, type BuilderState } from '../core';

/** A node by uid, or the message itself for `ROOT_UID` (its own fields: content, username…). */
export const useEditableNode = <T = BuilderNode>(uid: string): T | null =>
  useBuilderSelector(
    useCallback(
      (state: BuilderState) =>
        (uid === ROOT_UID ? state.doc : (findNode(state.doc, uid)?.node ?? null)) as unknown as T | null,
      [uid],
    ),
  );

const isEmpty = (value: unknown) =>
  value == null ||
  value === '' ||
  (typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(isEmpty));

/** A dotted field of a node: `title`, `author.name`, `media.url`. */
export const readField = (node: BuilderNode | null | undefined, field: string): unknown => {
  let value: unknown = node;
  for (const key of field.split('.')) {
    if (value == null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
};

export const readText = (node: BuilderNode | null | undefined, field: string) => {
  const value = readField(node, field);
  return typeof value === 'string' ? value : '';
};

/**
 * The shallow patch for `actions.update` that sets a dotted field. Empty values are removed rather than kept as
 * `''`, and an object left with nothing in it (an author without a name or icon) goes away too.
 */
export const patchField = (node: BuilderNode, field: string, value: unknown): Record<string, unknown> => {
  // The message's content is always a string.
  if ((node as { uid?: string }).uid === ROOT_UID && field === 'content') return { content: value ?? '' };
  const [head, ...rest] = field.split('.');
  if (rest.length === 0) return { [head]: isEmpty(value) ? undefined : value };
  const current = (node as unknown as Record<string, unknown>)[head];
  const object = current != null && typeof current === 'object' ? { ...(current as Record<string, unknown>) } : {};
  const inner = patchField(object as unknown as BuilderNode, rest.join('.'), value);
  for (const [key, next] of Object.entries(inner)) {
    if (next === undefined) delete object[key];
    else object[key] = next;
  }
  return { [head]: isEmpty(object) ? undefined : object };
};
