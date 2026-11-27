// Removes what a builder's restrictions don't allow from a document, e.g. after importing JSON.
import { convertToMode } from './convert';
import {
  allowedModes,
  areEmbedsAllowed,
  componentNames,
  countLimit,
  effectiveLimit,
  isComponentAllowed,
  isEmbedPartAllowed,
  isMessageFieldAllowed,
  isModeAllowed,
  type BuilderRestrictions,
  type ComponentName,
  type EmbedPart,
  type MessageField,
} from './restrictions';
import type { BuilderDocument, BuilderNode, ComponentNode, EmbedNode, TopLevelComponentNode } from './types';

type Json = Record<string, unknown>;

const EMBED_PARTS: readonly EmbedPart[] = [
  'title',
  'description',
  'url',
  'color',
  'timestamp',
  'author',
  'footer',
  'image',
  'thumbnail',
  'fields',
];

const MESSAGE_FIELDS: readonly Exclude<MessageField, 'content' | 'flags'>[] = [
  'username',
  'avatar_url',
  'tts',
  'thread_name',
  'applied_tags',
  'allowed_mentions',
  'poll',
  'attachments',
];

/** `list` itself when `next` has the same items, so unchanged parts keep their identity. */
const same = <T>(list: readonly T[], next: T[]): T[] =>
  list.length === next.length && list.every((item, index) => item === next[index]) ? (list as T[]) : next;

const sanitizeEmbed = (embed: EmbedNode, restrictions: BuilderRestrictions): EmbedNode => {
  let next = embed;
  for (const part of EMBED_PARTS) {
    if (part === 'fields' || isEmbedPartAllowed(restrictions, part) || !(part in next)) continue;
    const { [part]: _removed, ...rest } = next;
    next = rest as EmbedNode;
  }
  const fieldLimit = isEmbedPartAllowed(restrictions, 'fields') ? effectiveLimit(restrictions, 'embedFields') : 0;
  if (next.fields.length > fieldLimit) next = { ...next, fields: next.fields.slice(0, fieldLimit) };
  return next;
};

/** Children lists capped by a restriction limit. */
const CAPPED: Partial<Record<number, { key: string; limit: Parameters<typeof effectiveLimit>[1] }>> = {
  1: { key: 'components', limit: 'actionRowButtons' },
  3: { key: 'options', limit: 'selectOptions' },
  9: { key: 'components', limit: 'sectionComponents' },
  12: { key: 'items', limit: 'galleryItems' },
};

/**
 * A copy of the document without what the restrictions don't allow: a disallowed mode is converted to an
 * allowed one; disallowed message fields, embeds, embed parts and components are removed (the text of a
 * disallowed container or section is kept by moving its allowed children up); counts and list limits drop the
 * extra items. Text isn't shortened: over-long text stays and is reported by validation.
 */
export const sanitize = (doc: BuilderDocument, restrictions: BuilderRestrictions | undefined): BuilderDocument => {
  if (!restrictions) return doc;
  let next = doc;
  if (!isModeAllowed(restrictions, next.mode)) {
    next = convertToMode(next, allowedModes(restrictions)[0]);
  }

  if (!isMessageFieldAllowed(restrictions, 'content') && next.content !== '') next = { ...next, content: '' };
  for (const field of MESSAGE_FIELDS) {
    if (isMessageFieldAllowed(restrictions, field) || next[field] === undefined) continue;
    const { [field]: _removed, ...rest } = next;
    next = rest as BuilderDocument;
  }
  if (!isMessageFieldAllowed(restrictions, 'flags') && next.flags) {
    const { flags: _flags, ...rest } = next;
    next = rest as BuilderDocument;
  }

  const embeds = areEmbedsAllowed(restrictions)
    ? next.embeds.slice(0, effectiveLimit(restrictions, 'embeds')).map((embed) => sanitizeEmbed(embed, restrictions))
    : [];
  if (same(next.embeds, embeds) !== next.embeds) next = { ...next, embeds };

  const counts = new Map<ComponentName, number>();
  const keep = (node: { type?: unknown; style?: unknown }) => {
    if (!isComponentAllowed(restrictions, node)) return false;
    const names = componentNames(node);
    if (names.some((name) => (counts.get(name) ?? 0) >= countLimit(restrictions, name))) return false;
    for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
    return true;
  };

  const sanitizeList = (nodes: readonly BuilderNode[]): BuilderNode[] => {
    const result: BuilderNode[] = [];
    for (const node of nodes) {
      const type = (node as { type?: unknown }).type;
      if (typeof type !== 'number') {
        result.push(node);
        continue;
      }
      if (!keep(node as ComponentNode)) {
        // Keep a disallowed container's or section's content by moving its allowed children up.
        if (type === 17 || type === 9) result.push(...sanitizeList((node as { components: BuilderNode[] }).components));
        continue;
      }
      const sanitized = sanitizeChildren(node as ComponentNode);
      if (sanitized) result.push(sanitized);
    }
    return result;
  };

  /** The node with sanitized children, or null when it lost everything it needs. */
  const sanitizeChildren = (node: ComponentNode): BuilderNode | null => {
    const source = node as Json;
    let copy: Json | null = null;
    const set = (key: string, value: unknown) => {
      copy ??= { ...source };
      if (value === undefined) delete copy[key];
      else copy[key] = value;
    };
    const capped = CAPPED[node.type];
    if (Array.isArray(source.components)) {
      const children = source.components as BuilderNode[];
      let next = sanitizeList(children);
      if (capped?.key === 'components') next = next.slice(0, effectiveLimit(restrictions, capped.limit));
      next = same(children, next);
      if (next !== children) {
        if (next.length === 0 && children.length > 0) return null;
        set('components', next);
      }
    }
    if (capped && capped.key !== 'components' && Array.isArray(source[capped.key])) {
      const list = source[capped.key] as unknown[];
      const limit = effectiveLimit(restrictions, capped.limit);
      if (list.length > limit) set(capped.key, list.slice(0, limit));
    }
    if (source.accessory && typeof source.accessory === 'object') {
      const accessory = source.accessory as ComponentNode;
      if (!keep(accessory)) {
        // A section can't stand without its accessory.
        return null;
      }
    }
    return (copy ?? source) as unknown as BuilderNode;
  };

  // Sections whose accessory isn't allowed are replaced by their text displays.
  const unwrapSections = (nodes: readonly BuilderNode[]): BuilderNode[] =>
    nodes.flatMap((node) => {
      const source = node as Json;
      if (
        source.type === 9 &&
        source.accessory &&
        !isComponentAllowed(restrictions, source.accessory as ComponentNode)
      ) {
        return source.components as BuilderNode[];
      }
      if (source.type === 17 && Array.isArray(source.components)) {
        const children = unwrapSections(source.components as BuilderNode[]);
        return [
          same(source.components as BuilderNode[], children) === source.components
            ? node
            : ({ ...source, components: children } as BuilderNode),
        ];
      }
      return [node];
    });

  const components = same(next.components, sanitizeList(unwrapSections(next.components)) as TopLevelComponentNode[]);
  if (components !== next.components) next = { ...next, components };
  return next;
};
