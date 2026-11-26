import { describe, expect, it } from 'vitest';
import {
  createDocument,
  findNode,
  fromJSON,
  nodeToAPI,
  parseMessageJSON,
  ROOT_UID,
  toJSON,
  updateNode,
  validateMessage,
} from '../src/core';
import { errors, fixture, fixtureNames } from './helpers';

describe('fromJSON / toJSON', () => {
  it.each(fixtureNames)('round-trips %s losslessly', (name) => {
    const payload = fixture(name);
    expect(toJSON(fromJSON(payload))).toEqual(payload);
  });

  it.each(fixtureNames)('%s is valid', (name) => {
    const payload = fixture(name);
    const files = (payload.attachments ?? []).map((attachment) => attachment.filename!);
    expect(errors(validateMessage(payload, { applicationOwnedWebhook: true, files }))).toEqual([]);
  });

  it('gives every node a unique uid', () => {
    const doc = fromJSON(fixture('cv2-showcase'));
    const uids = new Set<string>();
    const visit = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') {
        const uid = (value as { uid?: string }).uid;
        if (uid) {
          expect(uids.has(uid)).toBe(false);
          uids.add(uid);
        }
        Object.values(value).forEach(visit);
      }
    };
    visit(doc.components);
    // 6 top-level; first container: 5 children, 3 section texts, 2 accessories, 3 gallery items, 2 buttons;
    // second container: 2 children; 2 selects.
    expect(uids.size).toBe(25);
  });

  it('reads the mode from the flags and keeps other flags', () => {
    const doc = fromJSON({ flags: 32768 | 4096, components: [{ type: 10, content: 'hi' }] });
    expect(doc.mode).toBe('cv2');
    expect(doc.flags).toBe(4096);
    expect(toJSON(doc).flags).toBe(32768 | 4096);
    expect(toJSON({ ...doc, mode: 'classic' }).flags).toBe(4096);
  });

  it('strips uids and empty optional fields', () => {
    const doc = fromJSON({ embeds: [{ title: 'Title' }] });
    const embed = doc.embeds[0];
    const edited = updateNode(doc, embed.uid, { description: '', url: '', author: { name: '' }, footer: undefined });
    expect(toJSON(edited)).toEqual({ embeds: [{ title: 'Title' }] });
  });

  it('keeps required fields that are empty, so validation reports them', () => {
    const doc = fromJSON({ embeds: [{ author: { name: '', icon_url: 'https://example.com/a.png' } }] });
    expect(toJSON(doc).embeds![0].author).toEqual({ name: '', icon_url: 'https://example.com/a.png' });
    const cv2 = fromJSON({ flags: 32768, components: [{ type: 10, content: '' }] });
    expect(toJSON(cv2).components).toEqual([{ type: 10, content: '' }]);
  });

  it('keeps an empty allowed_mentions.parse (it suppresses all mentions)', () => {
    const payload = { content: '@everyone', allowed_mentions: { parse: [] } };
    expect(toJSON(fromJSON(payload))).toEqual(payload);
  });

  it('passes unknown components and payload keys through untouched', () => {
    const payload = {
      flags: 32768,
      components: [{ type: 99, future: { nested: [1, 2] }, components: [{ type: 10, content: 'x' }] }],
      shared_client_theme: { colors: ['ff0000'] },
    };
    expect(toJSON(fromJSON(payload))).toEqual(payload);
  });

  it('drops response-only fields when importing a received message', () => {
    const doc = fromJSON({
      id: '1',
      channel_id: '2',
      author: { id: '3', username: 'x' },
      timestamp: '2025-01-01T00:00:00Z',
      content: 'hi',
      type: 0,
    });
    expect(toJSON(doc)).toEqual({ content: 'hi' });
  });

  it('is tolerant of junk', () => {
    expect(fromJSON(null)).toMatchObject({ uid: ROOT_UID, content: '', embeds: [], components: [] });
    expect(toJSON(fromJSON({ embeds: 'nope', components: [null] }))).toEqual({ components: [{ type: 0 }] });
  });

  it('nodeToAPI returns the same object for unchanged nodes', () => {
    const doc = fromJSON(fixture('classic-embeds'));
    const [first, second] = doc.embeds;
    const before = nodeToAPI(doc, second.uid);
    const next = updateNode(doc, first.uid, { title: 'Changed' });
    expect(nodeToAPI(next, second.uid)).toBe(before);
    expect(nodeToAPI(next, first.uid)).toMatchObject({ title: 'Changed' });
    expect(toJSON(next).embeds![1]).toBe(before);
  });

  it('findNode locates nested nodes with their JSON path', () => {
    const doc = fromJSON(fixture('cv2-showcase'));
    const container = doc.components[1] as { components: { accessory?: { uid: string } }[] };
    const accessory = container.components[0].accessory!;
    expect(findNode(doc, accessory.uid)).toMatchObject({
      kind: 'thumbnail',
      slot: 'accessory',
      path: ['components', 1, 'components', 0, 'accessory'],
    });
  });
});

describe('parseMessageJSON', () => {
  it('parses payloads and reports bad JSON', () => {
    expect(parseMessageJSON('{"content":"hi"}').doc?.content).toBe('hi');
    expect(parseMessageJSON('{').errors[0]).toMatch(/Invalid JSON/);
    expect(parseMessageJSON('[1]').errors[0]).toMatch(/JSON object/);
  });

  it('accepts Discohook-style backups', () => {
    const { doc } = parseMessageJSON(JSON.stringify({ messages: [{ data: { content: 'from backup' } }] }));
    expect(doc?.content).toBe('from backup');
  });

  it('starts empty documents in the requested mode', () => {
    expect(createDocument('cv2').mode).toBe('cv2');
  });
});
