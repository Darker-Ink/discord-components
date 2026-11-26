import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  allowedTemplates,
  canInsert,
  canMove,
  checkInsert,
  createBuilderStore,
  createDocument,
  duplicateNode,
  effectiveLimit,
  fromJSON,
  getDocumentStats,
  getLimit,
  insertNode,
  isComponentAllowed,
  isTemplateAllowed,
  mergeRestrictions,
  MessageBuilderProvider,
  moveNode,
  restrictionPresets,
  ROOT_UID,
  sanitize,
  setMode,
  toJSON,
  useAllowedTemplates,
  useBuilderRestrictions,
  validateDocument,
  validateMessage,
  type BuilderRestrictions,
  type ContainerNode,
  type SectionNode,
} from '../src/core';
import { codes, errors, fixture } from './helpers';

const CV2 = 32768;
const text = (content = 'text') => ({ type: 10, content });
const restricted = (payload: unknown, restrictions: BuilderRestrictions) =>
  validateMessage(payload, { restrictions, applicationOwnedWebhook: true })
    .filter((issue) => issue.restricted)
    .map((issue) => `${issue.path.join('.')}:${issue.code}`);

describe('which components are allowed', () => {
  it('specific names win over groups, groups over default', () => {
    const rules: BuilderRestrictions = {
      components: { default: false, button: true, dangerButton: false, textDisplay: true },
    };
    expect(isComponentAllowed(rules, { type: 2, style: 1 })).toBe(true);
    expect(isComponentAllowed(rules, { type: 2, style: 4 })).toBe(false);
    expect(isComponentAllowed(rules, { type: 10 })).toBe(true);
    expect(isComponentAllowed(rules, { type: 13 })).toBe(false);
    expect(isComponentAllowed(rules, 'dangerButton')).toBe(false);
    expect(isComponentAllowed(rules, 'linkButton')).toBe(true);
    expect(isComponentAllowed(undefined, 'file')).toBe(true);
  });

  it('a group name is allowed when any member is', () => {
    const linksOnly = restrictionPresets.nonInteractive;
    expect(isComponentAllowed(linksOnly, 'button')).toBe(true);
    expect(isComponentAllowed(linksOnly, 'select')).toBe(false);
    expect(isComponentAllowed(linksOnly, { type: 2, style: 5 })).toBe(true);
    expect(isComponentAllowed(linksOnly, { type: 2, style: 2 })).toBe(false);
    expect(isComponentAllowed(linksOnly, { type: 5 })).toBe(false);
    expect(isComponentAllowed(linksOnly, { type: 17 })).toBe(true);
  });

  it('merges restrictions, strictest first', () => {
    const merged = mergeRestrictions(
      restrictionPresets.textOnly,
      {
        components: { separator: false },
        modes: ['cv2'],
        limits: { content: 500, textDisplay: 300 },
      },
      { limits: { content: 100 } },
    );
    expect(isComponentAllowed(merged, 'textDisplay')).toBe(true);
    expect(isComponentAllowed(merged, 'separator')).toBe(false);
    expect(isComponentAllowed(merged, 'file')).toBe(false);
    expect(merged.modes).toEqual(['cv2']);
    expect(merged.limits).toEqual({ content: 100, textDisplay: 300 });
    expect(merged.embeds).toMatchObject({ image: false, title: true });
    expect(merged.message).toMatchObject({ attachments: false, content: true });
  });

  it('only tightens limits', () => {
    expect(effectiveLimit({ limits: { content: 100 } }, 'content')).toBe(100);
    expect(effectiveLimit({ limits: { content: 5000 } }, 'content')).toBe(2000);
    expect(getLimit('message', 'content', { limits: { content: 100 } })).toBe(100);
    expect(getLimit('embed', 'author.name', { limits: { authorName: 50 } })).toBe(50);
    expect(getLimit('textDisplay', 'content', { limits: { textDisplay: 9000 } })).toBe(4000);
    expect(getLimit('button', 'custom_id', { limits: { buttonLabel: 10 } })).toBe(100);
  });
});

describe('editing with restrictions', () => {
  const noFiles: BuilderRestrictions = { components: { file: false, mediaGallery: false } };

  it('canInsert and allowedTemplates leave out what is not allowed', () => {
    const doc = createDocument('cv2');
    expect(canInsert(doc, 'file', { parentId: null }, { restrictions: noFiles })).toBe(false);
    expect(checkInsert(doc, 'file', { parentId: null }, { restrictions: noFiles }).reason).toBe(
      "Files aren't allowed in this builder",
    );
    expect(canInsert(doc, 'file', { parentId: null })).toBe(true);
    expect(allowedTemplates(doc, { parentId: null }, { restrictions: restrictionPresets.textOnly })).toEqual([
      'text-display',
      'separator',
      'container',
    ]);
  });

  it('checks everything inside a new node', () => {
    const doc = fromJSON({ flags: CV2, components: [text()] });
    const container = fromJSON({
      flags: CV2,
      components: [{ type: 17, components: [{ type: 13, file: { url: 'attachment://a' } }] }],
    }).components[0];
    expect(canInsert(doc, container, { parentId: null }, { restrictions: noFiles })).toBe(false);
  });

  it('templates adapt their default children', () => {
    // Buttons are off, so a new section gets a thumbnail accessory.
    const rules: BuilderRestrictions = { components: { button: false } };
    const { doc, uid } = insertNode(createDocument('cv2'), { parentId: null }, 'section', { restrictions: rules });
    const section = doc.components.find((node) => node.uid === uid) as SectionNode;
    expect(section.accessory?.type).toBe(11);
    expect(isTemplateAllowed('section', { components: { button: false, thumbnail: false } })).toBe(false);
    expect(isTemplateAllowed('section', rules)).toBe(true);
    expect(isTemplateAllowed('embed', { embeds: false })).toBe(false);
    expect(isTemplateAllowed('embed', { modes: ['cv2'] })).toBe(false);
    expect(isTemplateAllowed('field', { embeds: { fields: false } })).toBe(false);
  });

  it('counts: at most N of a component', () => {
    const rules: BuilderRestrictions = { counts: { container: 1, button: 2 } };
    let doc = createDocument('cv2');
    doc = insertNode(doc, { parentId: null }, 'container', { restrictions: rules }).doc;
    expect(insertNode(doc, { parentId: null }, 'container', { restrictions: rules })).toMatchObject({
      uid: null,
      reason: 'Containers: at most 1 in this builder',
    });
    expect(duplicateNode(doc, doc.components[0].uid, { restrictions: rules }).uid).toBeNull();
    const row = insertNode(doc, { parentId: null }, 'action-row', { restrictions: rules });
    doc = row.doc;
    doc = insertNode(doc, { parentId: row.uid }, 'button', { restrictions: rules }).doc;
    doc = insertNode(doc, { parentId: row.uid }, 'link-button', { restrictions: rules }).doc;
    expect(canInsert(doc, 'button', { parentId: row.uid }, { restrictions: rules })).toBe(false);
  });

  it('tightened list limits apply to inserts and moves', () => {
    const rules: BuilderRestrictions = { limits: { embeds: 1, embedFields: 1, components: 3 } };
    let doc = createDocument('classic');
    doc = insertNode(doc, { parentId: null }, 'embed', { restrictions: rules }).doc;
    expect(canInsert(doc, 'embed', { parentId: null }, { restrictions: rules })).toBe(false);
    const two = fromJSON({
      embeds: [
        { title: 'a', fields: [{ name: 'n', value: 'v' }] },
        { title: 'b', fields: [{ name: 'n', value: 'v' }] },
      ],
    });
    const moving = two.embeds[1].fields[0].uid;
    expect(canMove(two, moving, { parentId: two.embeds[0].uid })).toBe(true);
    expect(canMove(two, moving, { parentId: two.embeds[0].uid }, { restrictions: rules })).toBe(false);
    expect(moveNode(two, moving, { parentId: two.embeds[0].uid }, { restrictions: rules })).toBe(two);
    const cv2 = fromJSON({ flags: CV2, components: [text(), text()] });
    expect(canInsert(cv2, 'separator', { parentId: null }, { restrictions: rules })).toBe(true);
    expect(canInsert(cv2, 'container', { parentId: null }, { restrictions: rules })).toBe(false);
  });

  it('embeds can be turned off, or their fields', () => {
    const doc = createDocument('classic');
    expect(canInsert(doc, 'embed', { parentId: null }, { restrictions: { embeds: false } })).toBe(false);
    const withEmbed = insertNode(doc, { parentId: null }, 'embed').doc;
    expect(
      canInsert(
        withEmbed,
        'field',
        { parentId: withEmbed.embeds[0].uid },
        { restrictions: { embeds: { fields: false } } },
      ),
    ).toBe(false);
  });

  it('setMode keeps to the allowed modes and sanitizes the result', () => {
    const doc = fromJSON(fixture('classic-embeds'));
    expect(setMode(doc, 'cv2', { restrictions: { modes: ['classic'] } })).toBe(doc);
    const cv2 = setMode(doc, 'cv2', {
      restrictions: { components: { container: false, section: false, button: false, select: false } },
    });
    const types = toJSON(cv2).components!.map((component) => component.type);
    // The embeds' text moves up out of the containers; buttons and selects (and their rows) are gone.
    expect(types.every((type) => type === 10 || type === 12)).toBe(true);
    expect(types.filter((type) => type === 10).length).toBeGreaterThan(3);
  });
});

describe('validation with restrictions', () => {
  it('reports disallowed components, embeds and fields with clear codes', () => {
    const rules: BuilderRestrictions = {
      components: { file: false },
      embeds: { image: false },
      message: { username: false, attachments: false },
    };
    expect(
      restricted(
        {
          flags: CV2,
          username: 'x',
          components: [{ type: 17, components: [text(), { type: 13, file: { url: 'attachment://a.txt' } }] }],
          attachments: [{ id: 0, filename: 'a.txt' }],
        },
        rules,
      ),
    ).toEqual([
      'username:FIELD_NOT_ALLOWED',
      'attachments:FIELD_NOT_ALLOWED',
      'components.0.components.1:COMPONENT_NOT_ALLOWED',
    ]);
    expect(restricted({ embeds: [{ title: 't', image: { url: 'https://a.com/a.png' } }] }, rules)).toEqual([
      'embeds.0.image:EMBED_FIELD_NOT_ALLOWED',
    ]);
    expect(restricted({ embeds: [{ title: 't' }] }, { embeds: false })).toEqual(['embeds:EMBEDS_NOT_ALLOWED']);
    expect(restricted({ content: 'hi' }, { message: { content: false } })).toEqual(['content:FIELD_NOT_ALLOWED']);
  });

  it('reports a mode the builder does not make', () => {
    expect(restricted({ content: 'hi' }, { modes: ['cv2'] })).toEqual(['flags:MODE_NOT_ALLOWED']);
    expect(restricted({ flags: CV2, components: [text()] }, { modes: ['cv2'] })).toEqual([]);
  });

  it('reports counts on each extra component', () => {
    const payload = {
      flags: CV2,
      components: [
        { type: 17, components: [text()] },
        { type: 17, components: [text()] },
      ],
    };
    const issues = validateMessage(payload, { restrictions: { counts: { container: 1 } } }).filter(
      (issue) => issue.restricted,
    );
    expect(issues).toMatchObject([{ path: ['components', 1], code: 'MAX_COUNT', limit: 1, actual: 2 }]);
  });

  it('a tightened limit replaces Discord’s issue instead of adding one', () => {
    const rules = { limits: { content: 100, textDisplay: 10, embedTitle: 5, components: 2, buttonLabel: 3 } };
    const over = validateMessage({ content: 'x'.repeat(2500) }, { restrictions: rules });
    expect(over.map((issue) => [issue.code, issue.limit, issue.restricted])).toEqual([['MAX_LENGTH', 100, true]]);
    expect(errors(validateMessage({ content: 'x'.repeat(100) }, { restrictions: rules }))).toEqual([]);
    expect(restricted({ embeds: [{ title: 'toolong' }] }, rules)).toEqual(['embeds.0.title:MAX_LENGTH']);
    expect(restricted({ flags: CV2, components: [text('a'.repeat(11)), text(), text()] }, rules)).toEqual([
      'components.0.content:MAX_LENGTH',
      'components:COMPONENT_COUNT',
    ]);
    // Limits above Discord's are ignored.
    expect(restricted({ content: 'x'.repeat(2001) }, { limits: { content: 3000 } })).toEqual([]);
    expect(
      codes(validateMessage({ content: 'x'.repeat(2001) }, { restrictions: { limits: { content: 3000 } } })),
    ).toEqual(['MAX_LENGTH']);
  });

  it('maps restricted issues to nodes in documents', () => {
    const doc = fromJSON({
      flags: CV2,
      components: [{ type: 17, components: [{ type: 13, file: { url: 'attachment://a' } }] }],
    });
    const container = doc.components[0] as ContainerNode;
    const issues = validateDocument(doc, { restrictions: { components: { file: false } } }).filter(
      (issue) => issue.restricted,
    );
    expect(issues).toMatchObject([{ nodeId: container.components[0].uid, code: 'COMPONENT_NOT_ALLOWED' }]);
  });
});

describe('sanitize', () => {
  it('strips what is not allowed and keeps the rest (fromJSON keeps everything)', () => {
    const doc = fromJSON(fixture('cv2-showcase'));
    expect(toJSON(doc)).toEqual(fixture('cv2-showcase'));
    const clean = sanitize(doc, { ...restrictionPresets.textOnly, message: { username: false, attachments: false } });
    expect(
      errors(validateDocument(clean, { restrictions: restrictionPresets.textOnly })).filter(
        (issue) => issue.restricted,
      ),
    ).toEqual([]);
    const json = toJSON(clean);
    expect(json.username).toBeUndefined();
    expect(json.attachments).toBeUndefined();
    // The sections' text displays stay (moved up into the container), media and interactive parts go.
    expect(JSON.stringify(json)).toContain('Golden Sword');
    expect(JSON.stringify(json)).not.toContain('"type":13');
    expect(JSON.stringify(json)).not.toContain('"type":12');
    expect(JSON.stringify(json)).not.toContain('"type":1,');
  });

  it('applies counts, list limits, embed parts and modes', () => {
    const doc = fromJSON({
      content: 'hi',
      embeds: [
        {
          title: 't',
          image: { url: 'https://a.com/a.png' },
          fields: [
            { name: 'a', value: '1' },
            { name: 'b', value: '2' },
          ],
        },
        { title: 'u' },
      ],
    });
    const json = toJSON(sanitize(doc, { embeds: { image: false }, limits: { embeds: 1, embedFields: 1 } }));
    expect(json).toEqual({ content: 'hi', embeds: [{ title: 't', fields: [{ name: 'a', value: '1' }] }] });
    const cv2 = sanitize(doc, { modes: ['cv2'] });
    expect(cv2.mode).toBe('cv2');
    const containers = fromJSON({
      flags: CV2,
      components: [
        { type: 17, components: [text('a')] },
        { type: 17, components: [text('b')] },
      ],
    });
    // The extra container's text is kept, moved up to the top level.
    expect(toJSON(sanitize(containers, { counts: { container: 1 } })).components).toEqual([
      { type: 17, components: [text('a')] },
      text('b'),
    ]);
  });

  it('returns the same document when there is nothing to strip', () => {
    const doc = fromJSON(fixture('cv2-showcase'));
    expect(sanitize(doc, {})).toBe(doc);
    expect(sanitize(doc, { components: { select: true } })).toBe(doc);
  });
});

describe('store with restrictions', () => {
  it('enforces them in actions and reports them in issues and stats', () => {
    const store = createBuilderStore(null, {
      restrictions: { modes: ['cv2'], components: { file: false }, limits: { components: 5 } },
    });
    // An empty document starts in an allowed mode.
    expect(store.getState().doc.mode).toBe('cv2');
    expect(store.actions.insert(null, undefined, undefined, 'file')).toBeNull();
    expect(store.checkInsert('file', { parentId: null })).toMatchObject({ ok: false });
    expect(store.allowedTemplates({ parentId: null })).not.toContain('file');
    store.actions.setMode('classic');
    expect(store.getState().doc.mode).toBe('cv2');
    expect(store.getStats().componentLimit).toBe(5);
    store.actions.replace({ flags: CV2, components: [{ type: 13, file: { url: 'attachment://a' } }] });
    expect(store.getIssues().map((issue) => issue.code)).toContain('COMPONENT_NOT_ALLOWED');
    store.sanitize();
    expect(store.getIssues().filter((issue) => issue.restricted)).toEqual([]);
    store.actions.undo();
    expect(store.toJSON().components).toHaveLength(1);
  });

  it('updates issues when the restrictions change', () => {
    const store = createBuilderStore({ content: 'hello' });
    expect(store.getIssues()).toEqual([]);
    store.setOptions({ restrictions: { message: { content: false } } });
    expect(store.getIssues()).toMatchObject([{ nodeId: ROOT_UID, field: 'content', code: 'FIELD_NOT_ALLOWED' }]);
  });

  it('getDocumentStats uses the tightened limits', () => {
    const doc = fromJSON({ content: 'x' });
    expect(getDocumentStats(doc, { limits: { content: 10, embedTotal: 1000 } })).toMatchObject({
      contentLimit: 10,
      embedCharacterLimit: 1000,
      embedLimit: 10,
    });
    expect(getDocumentStats(doc).contentLimit).toBe(2000);
  });
});

describe('React bindings with restrictions', () => {
  it('useAllowedTemplates and useBuilderRestrictions read the provider', () => {
    const seen: unknown[] = [];
    const Probe = () => {
      seen.push(useAllowedTemplates({ parentId: null, slot: 'components' }), useBuilderRestrictions());
      return null;
    };
    const rules = restrictionPresets.textOnly;
    renderToString(
      createElement(
        MessageBuilderProvider,
        { defaultValue: { flags: CV2 }, restrictions: rules },
        createElement(Probe),
      ),
    );
    expect(seen).toEqual([['text-display', 'separator', 'container'], rules]);
  });
});
