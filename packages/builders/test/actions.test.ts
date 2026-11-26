import { describe, expect, it } from 'vitest';
import {
  allowedTemplates,
  canInsert,
  canMove,
  checkMove,
  countComponents,
  createDocument,
  createNode,
  duplicateNode,
  findNode,
  fromJSON,
  insertNode,
  moveNode,
  removeNode,
  setMode,
  toJSON,
  updateNode,
  validateDocument,
  type ActionRowNode,
  type ButtonNode,
  type BuilderDocument,
  type ContainerNode,
  type SectionNode,
} from '../src/core';
import { errors, fixture } from './helpers';

const insert = (
  doc: BuilderDocument,
  ...args: Parameters<typeof insertNode> extends [unknown, ...infer R] ? R : never
) => {
  const result = insertNode(doc, ...args);
  if (!result.uid) throw new Error(result.reason);
  return result;
};

const cv2WithRow = () => {
  let doc = createDocument('cv2');
  const row = insert(doc, { parentId: null }, 'action-row');
  doc = row.doc;
  return { doc, row: row.uid! };
};

describe('insert', () => {
  it('infers the slot from the parent and child', () => {
    let doc = createDocument('cv2');
    const section = insert(doc, { parentId: null }, 'section');
    doc = section.doc;
    const node = findNode(doc, section.uid!)!.node as SectionNode;
    // The template's accessory takes the slot, so a thumbnail can't go in.
    expect(canInsert(doc, 'thumbnail', { parentId: section.uid })).toBe(false);
    doc = removeNode(doc, node.accessory!.uid);
    const thumbnail = insert(doc, { parentId: section.uid }, 'thumbnail');
    expect(findNode(thumbnail.doc, thumbnail.uid!)).toMatchObject({ slot: 'accessory', kind: 'thumbnail' });
    const text = insert(thumbnail.doc, { parentId: section.uid, index: 0 }, 'text-display');
    expect(findNode(text.doc, text.uid!)).toMatchObject({ slot: 'components', index: 0 });
  });

  it('respects the mode at the top level', () => {
    expect(canInsert(createDocument('classic'), 'embed', { parentId: null })).toBe(true);
    expect(canInsert(createDocument('cv2'), 'embed', { parentId: null })).toBe(false);
    expect(canInsert(createDocument('classic'), 'container', { parentId: null })).toBe(false);
    expect(canInsert(createDocument('classic'), 'action-row', { parentId: null })).toBe(true);
    expect(allowedTemplates(createDocument('classic'), { parentId: null, slot: 'components' })).toEqual(['action-row']);
    expect(allowedTemplates(createDocument('cv2'), { parentId: null, slot: 'components' })).toEqual([
      'action-row',
      'text-display',
      'section',
      'media-gallery',
      'file',
      'separator',
      'container',
    ]);
    expect(allowedTemplates(createDocument('cv2'), { parentId: null, slot: 'embeds' })).toEqual([]);
  });

  it('fills action rows with up to 5 buttons or one select', () => {
    const start = cv2WithRow();
    const { row } = start;
    let { doc } = start;
    for (let i = 0; i < 5; i++) doc = insert(doc, { parentId: row }, 'button').doc;
    expect(canInsert(doc, 'button', { parentId: row })).toBe(false);
    expect(canInsert(doc, 'string-select', { parentId: row })).toBe(false);
    const empty = cv2WithRow();
    const withSelect = insert(empty.doc, { parentId: empty.row }, 'user-select').doc;
    expect(canInsert(withSelect, 'button', { parentId: empty.row })).toBe(false);
    expect(allowedTemplates(withSelect, { parentId: empty.row })).toEqual([]);
    expect(allowedTemplates(empty.doc, { parentId: empty.row })).toEqual([
      'button',
      'link-button',
      'premium-button',
      'string-select',
      'user-select',
      'role-select',
      'mentionable-select',
      'channel-select',
    ]);
  });

  it('stops at 40 components in Components v2', () => {
    let doc = createDocument('cv2');
    for (let i = 0; i < 40; i++) doc = insert(doc, { parentId: null }, 'separator').doc;
    expect(countComponents(doc)).toBe(40);
    expect(insertNode(doc, { parentId: null }, 'separator')).toMatchObject({
      uid: null,
      reason: 'A message can have up to 40 components (40 used)',
    });
    // A section is 3 components.
    doc = removeNode(doc, doc.components[0].uid);
    expect(canInsert(doc, 'separator', { parentId: null })).toBe(true);
    expect(canInsert(doc, 'section', { parentId: null })).toBe(false);
  });

  it('caps embeds, fields, options and gallery items', () => {
    let doc = createDocument('classic');
    for (let i = 0; i < 10; i++) doc = insert(doc, { parentId: null }, 'embed').doc;
    expect(canInsert(doc, 'embed', { parentId: null })).toBe(false);
    const embed = doc.embeds[0].uid;
    for (let i = 0; i < 25; i++) doc = insert(doc, { parentId: embed }, 'field').doc;
    expect(canInsert(doc, 'field', { parentId: embed })).toBe(false);

    let cv2 = createDocument('cv2');
    const gallery = insert(cv2, { parentId: null }, 'media-gallery');
    cv2 = gallery.doc;
    for (let i = 0; i < 9; i++) cv2 = insert(cv2, { parentId: gallery.uid }, 'gallery-item').doc;
    expect(canInsert(cv2, 'gallery-item', { parentId: gallery.uid })).toBe(false);
  });

  it('gives inserted nodes new uids', () => {
    const doc = fromJSON(fixture('classic-embeds'));
    const copy = doc.embeds[0];
    const result = insert(doc, { parentId: null, slot: 'embeds' }, copy, 'embed');
    const inserted = findNode(result.doc, result.uid!)!.node as typeof copy;
    expect(inserted.uid).not.toBe(copy.uid);
    expect(inserted.fields[0].uid).not.toBe(copy.fields[0].uid);
  });
});

describe('canMove', () => {
  const doc = fromJSON(fixture('cv2-showcase'));
  const [heading, shop, mystery] = doc.components as [{ uid: string }, ContainerNode, ContainerNode];
  const firstSection = shop.components[0] as SectionNode;
  const buttonRow = shop.components[4] as ActionRowNode;

  it('allows moves the nesting rules allow', () => {
    expect(canMove(doc, heading.uid, { parentId: shop.uid, index: 0 })).toBe(true);
    expect(canMove(doc, heading.uid, { parentId: firstSection.uid, index: 0 })).toBe(true); // 3rd text display
    expect(canMove(doc, firstSection.components[0].uid, { parentId: mystery.uid, index: 0 })).toBe(true);
    expect(canMove(doc, buttonRow.uid, { parentId: null, index: 0 })).toBe(true);
  });

  it('rejects moves the nesting rules forbid', () => {
    expect(checkMove(doc, mystery.uid, { parentId: shop.uid })).toEqual({
      ok: false,
      reason: "A container can't go in a container",
    });
    expect(canMove(doc, buttonRow.components[0].uid, { parentId: null })).toBe(false);
    expect(canMove(doc, firstSection.accessory!.uid, { parentId: buttonRow.uid })).toBe(false); // thumbnail
    expect(checkMove(doc, shop.uid, { parentId: shop.components[1].uid })).toMatchObject({ ok: false });
  });

  it("doesn't put a node inside itself", () => {
    const nested = fromJSON({ flags: 32768, components: [{ type: 17, components: [{ type: 10, content: 'x' }] }] });
    const container = nested.components[0] as ContainerNode;
    expect(checkMove(nested, container.uid, { parentId: container.uid })).toEqual({
      ok: false,
      reason: "A container can't go in a container",
    });
  });

  it('counts the dragged node out of its own list', () => {
    // A full action row can still reorder its own buttons, but takes no button from elsewhere.
    const full = fromJSON({
      flags: 32768,
      components: [
        {
          type: 1,
          components: Array.from({ length: 5 }, (_, i) => ({ type: 2, style: 2, label: `${i}`, custom_id: `${i}` })),
        },
        { type: 1, components: [{ type: 2, style: 2, label: 'x', custom_id: 'x' }] },
      ],
    });
    const [rowA, rowB] = full.components as ActionRowNode[];
    expect(canMove(full, rowA.components[0].uid, { parentId: rowA.uid, index: 4 })).toBe(true);
    expect(canMove(full, rowB.components[0].uid, { parentId: rowA.uid, index: 0 })).toBe(false);
  });

  it('lets a section swap its accessory only when it is empty', () => {
    expect(canMove(doc, buttonRow.components[0].uid, { parentId: firstSection.uid, slot: 'accessory' })).toBe(false);
    const withoutAccessory = removeNode(doc, firstSection.accessory!.uid);
    expect(
      canMove(withoutAccessory, buttonRow.components[0].uid, { parentId: firstSection.uid, slot: 'accessory' }),
    ).toBe(true);
  });
});

describe('move', () => {
  it('reorders within a list (final index) and moves across lists', () => {
    const doc = fromJSON(fixture('classic-embeds'));
    const fields = doc.embeds[0].fields;
    const reordered = moveNode(doc, fields[0].uid, { parentId: doc.embeds[0].uid, index: 2 });
    expect(reordered.embeds[0].fields.map((field) => field.name)).toEqual(['Fixed', 'Removed', 'Added']);
    const across = moveNode(doc, fields[0].uid, { parentId: doc.embeds[2].uid, index: 0 });
    expect(across.embeds[0].fields.map((field) => field.name)).toEqual(['Fixed', 'Removed']);
    expect(across.embeds[2].fields.map((field) => field.name)).toEqual(['Added', 'Workaround']);
    expect(findNode(across, fields[0].uid)).toMatchObject({ parentId: doc.embeds[2].uid, index: 0 });
  });

  it('returns the same document for a forbidden move', () => {
    const doc = fromJSON(fixture('classic-embeds'));
    expect(moveNode(doc, doc.embeds[0].fields[0].uid, { parentId: null })).toBe(doc);
  });

  it('keeps untouched nodes', () => {
    const doc = fromJSON(fixture('classic-embeds'));
    const next = moveNode(doc, doc.embeds[0].fields[0].uid, { parentId: doc.embeds[0].uid, index: 1 });
    expect(next.embeds[1]).toBe(doc.embeds[1]);
    expect(next.components).toBe(doc.components);
  });
});

describe('update / remove / duplicate', () => {
  it('merges patches and deletes undefined keys', () => {
    const doc = fromJSON({ embeds: [{ title: 'a', color: 1 }] });
    const next = updateNode(doc, doc.embeds[0].uid, { title: 'b', color: undefined });
    expect(toJSON(next)).toEqual({ embeds: [{ title: 'b' }] });
    expect(updateNode(doc, doc.embeds[0].uid, { title: 'a' })).toBe(doc);
    expect(toJSON(updateNode(doc, null, { content: 'hi', username: 'Bot' }))).toMatchObject({
      content: 'hi',
      username: 'Bot',
    });
  });

  it("doesn't let patches replace child lists or uids", () => {
    const doc = fromJSON({ embeds: [{ title: 'a', fields: [{ name: 'n', value: 'v' }] }] });
    const next = updateNode(doc, doc.embeds[0].uid, { fields: [], uid: 'x' });
    expect(next).toBe(doc);
  });

  it('reshapes a node whose type changes', () => {
    const doc = fromJSON({
      components: [{ type: 1, components: [{ type: 3, custom_id: 's', options: [{ label: 'a', value: 'a' }] }] }],
    });
    const select = (doc.components[0] as ActionRowNode).components[0];
    const next = updateNode(doc, select.uid, { type: 5 });
    expect(toJSON(next).components![0]).toEqual({ type: 1, components: [{ type: 5, custom_id: 's' }] });
  });

  it('duplicates with unique custom ids and option values, without API ids', () => {
    const doc = fromJSON(fixture('cv2-showcase'));
    const shop = doc.components[1] as ContainerNode;
    const { doc: next, uid } = duplicateNode(doc, shop.uid);
    expect(findNode(next, uid!)).toMatchObject({ index: 2 });
    expect(
      errors(validateDocument(next, { applicationOwnedWebhook: true, files: ['shield-3.png', 'contents.txt'] })),
    ).toEqual([]);
    const copy = toJSON(next).components![2] as unknown as { components: { accessory?: { custom_id?: string } }[] };
    expect(copy.components[2].accessory?.custom_id).toBe('buy:shield-copy');

    const select = fromJSON({
      components: [
        { type: 1, id: 7, components: [{ type: 3, custom_id: 's', options: [{ label: 'a', value: 'a' }] }] },
      ],
    });
    const option = ((select.components[0] as ActionRowNode).components[0] as { options: { uid: string }[] }).options[0];
    const withOption = duplicateNode(select, option.uid).doc;
    expect(toJSON(withOption).components![0]).toMatchObject({
      components: [{ options: [{ value: 'a' }, { value: 'a-copy' }] }],
    });
    const rowCopy = duplicateNode(select, select.components[0].uid).doc;
    expect(toJSON(rowCopy).components![1]).not.toHaveProperty('id');
  });

  it("won't duplicate into a full parent", () => {
    let doc = createDocument('classic');
    for (let i = 0; i < 10; i++) doc = insertNode(doc, { parentId: null }, 'embed').doc;
    expect(duplicateNode(doc, doc.embeds[0].uid).uid).toBeNull();
  });

  it('creates templates with unique custom ids', () => {
    const a = createNode<ButtonNode>('button') as ButtonNode & { custom_id?: string };
    const b = createNode<ButtonNode>('button') as ButtonNode & { custom_id?: string };
    expect(a.custom_id).not.toBe(b.custom_id);
  });
});

describe('setMode', () => {
  it('converts embeds to containers', () => {
    const doc = fromJSON(fixture('classic-embeds'));
    const cv2 = setMode(doc, 'cv2');
    expect(cv2.mode).toBe('cv2');
    expect(cv2.embeds).toEqual([]);
    expect(cv2.content).toBe('');
    const json = toJSON(cv2);
    expect(json.flags).toBe(32768);
    expect(json.components!.map((component) => component.type)).toEqual([10, 17, 17, 17, 1, 1]);
    expect(json.components![1]).toMatchObject({
      type: 17,
      accent_color: 5793266,
      components: [
        {
          type: 9,
          components: [
            {
              type: 10,
              content:
                '-# [Example Team](https://example.com)\n### [Version 2.4.0](https://example.com/changelog/2.4.0)\nA smaller release with a lot of fixes.\n\n- Faster startup\n- New themes',
            },
          ],
          accessory: { type: 11, media: { url: 'https://cdn.example.com/logo.png' } },
        },
        { type: 10, content: expect.stringContaining('**Added**\nDark mode for the dashboard') },
        { type: 10, content: '-# Example Inc. • <t:1745341200:f>' },
      ],
    });
    expect(errors(validateDocument(cv2, { applicationOwnedWebhook: true, files: ['themes.png'] }))).toEqual([]);
  });

  it('converts containers back to embeds', () => {
    const doc = setMode(fromJSON(fixture('classic-embeds')), 'cv2');
    const classic = setMode(doc, 'classic');
    const json = toJSON(classic);
    expect(json.flags).toBeUndefined();
    expect(json.embeds![0]).toMatchObject({
      title: 'Version 2.4.0',
      url: 'https://example.com/changelog/2.4.0',
      author: { name: 'Example Team', url: 'https://example.com' },
      color: 5793266,
      thumbnail: { url: 'https://cdn.example.com/logo.png' },
    });
    expect(json.content).toBe('**Patch notes** are out! <@&123456789012345678>');
    expect(json.components).toHaveLength(2);
  });

  it('without convert, drops what the mode cannot show', () => {
    const classic = fromJSON(fixture('classic-embeds'));
    expect(toJSON(setMode(classic, 'cv2', { convert: false })).components).toHaveLength(2);
    const cv2 = fromJSON(fixture('cv2-showcase'));
    const json = toJSON(setMode(cv2, 'classic', { convert: false }));
    expect(json.components!.every((component) => component.type === 1)).toBe(true);
  });
});
