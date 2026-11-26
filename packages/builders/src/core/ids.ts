// Component `id`s (components/reference.mdx, "Anatomy of a Component"): optional 32-bit integers, unique in the
// message. The API fills in missing ones sequentially, skipping ids already in use; 0 counts as missing.
import type { APIMessageTopLevelComponent } from '@discord-mana/messages';

type Json = Record<string, unknown>;

const CHILD_KEYS = ['components', 'accessory'] as const;

const visit = (component: unknown, fn: (component: Json) => void) => {
  if (typeof component !== 'object' || component === null) return;
  fn(component as Json);
  for (const key of CHILD_KEYS) {
    const child = (component as Json)[key];
    if (Array.isArray(child)) child.forEach((item) => visit(item, fn));
    else visit(child, fn);
  }
};

/** The `id`s set in a list of components (nested ones included), 0 excluded. */
export const collectComponentIds = (components: readonly unknown[]): Set<number> => {
  const ids = new Set<number>();
  for (const component of components) {
    visit(component, (node) => {
      if (typeof node.id === 'number' && node.id !== 0) ids.add(node.id);
    });
  }
  return ids;
};

/**
 * Fills in missing component ids the way the API does: 1, 2, 3… in document order (depth first, a section's
 * accessory after its text), skipping ids already used. The order is inferred; the docs only say "sequentially".
 * Returns new objects; the input isn't changed.
 */
export const assignComponentIds = <T extends APIMessageTopLevelComponent | Json>(components: readonly T[]): T[] => {
  const used = collectComponentIds(components);
  let next = 1;
  const nextId = () => {
    while (used.has(next)) next++;
    used.add(next);
    return next;
  };
  const assign = (component: unknown): unknown => {
    if (typeof component !== 'object' || component === null) return component;
    const source = component as Json;
    const copy: Json = { ...source };
    if (typeof source.id !== 'number' || source.id === 0) copy.id = nextId();
    for (const key of CHILD_KEYS) {
      const child = source[key];
      if (Array.isArray(child)) copy[key] = child.map(assign);
      else if (child !== undefined) copy[key] = assign(child);
    }
    return copy;
  };
  return components.map((component) => assign(component) as T);
};
