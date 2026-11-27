import { describe, expect, it } from 'vitest';
import {
  allowedModes,
  createBuilderStore,
  createPoll,
  fromJSON,
  isMessageFieldAllowed,
  mergeRestrictions,
  restrictionPresets,
  ruleSources,
  sanitize,
  setMode,
  toJSON,
  validateDocument,
  validateMessage,
} from '../src/core';

const POLL = {
  question: { text: 'Which map next?' },
  answers: [{ poll_media: { text: 'Harbor', emoji: { name: '🔥' } } }, { poll_media: { text: 'Desert' } }],
  duration: 72,
  allow_multiselect: true,
};

const codes = (issues: { code: string; path: (string | number)[] }[]) =>
  issues.map((issue) => `${issue.code}@${issue.path.join('.')}`);

describe('poll messages', () => {
  it('is its own mode: a payload with a poll opens as one and writes back unchanged', () => {
    const doc = fromJSON({ poll: POLL, flags: 4096 });
    expect(doc.mode).toBe('poll');
    expect(toJSON(doc)).toEqual({ poll: POLL, flags: 4096 });
    expect(validateDocument(doc)).toEqual([]);
  });

  it('reports everything sent beside a poll (observed, not documented)', () => {
    const payload = {
      content: 'Hi',
      embeds: [{ title: 'E' }],
      components: [{ type: 1, components: [{ type: 2, style: 5, label: 'L', url: 'https://a.b' }] }],
      attachments: [{ id: 0, filename: 'a.png' }],
      sticker_ids: ['123456789012345678'],
      poll: POLL,
    };
    const issues = validateMessage(payload, { target: 'message' }).filter((issue) => issue.code === 'POLL_EXCLUSIVE');
    expect(codes(issues)).toEqual([
      'POLL_EXCLUSIVE@content',
      'POLL_EXCLUSIVE@embeds',
      'POLL_EXCLUSIVE@components',
      'POLL_EXCLUSIVE@attachments',
      'POLL_EXCLUSIVE@sticker_ids',
    ]);
    expect(issues[0].message).toMatch(/A poll can't be sent with anything else/);
    // fromJSON keeps them (in poll mode), so they can be seen and removed.
    const doc = fromJSON(payload);
    expect(doc.mode).toBe('poll');
    expect(doc.content).toBe('Hi');
    expect(doc.embeds).toHaveLength(1);
    expect(ruleSources.pollExclusive.inferred).toBe(true);
  });

  it('webhook params still apply to a poll', () => {
    const issues = validateMessage({
      poll: POLL,
      username: 'Polls',
      avatar_url: 'https://cdn.example.com/a.png',
      thread_name: 'Vote',
      allowed_mentions: { parse: [] },
      flags: 4096,
    });
    expect(issues).toEqual([]);
  });

  it('needs a poll in poll mode', () => {
    const doc = { ...fromJSON({}), mode: 'poll' as const };
    expect(codes(validateDocument(doc))).toEqual(['REQUIRED@poll']);
  });

  it('switching to a poll keeps a question and drops the rest (undo brings it back)', () => {
    const store = createBuilderStore({
      content: '## Patch notes\nMore below',
      embeds: [{ title: 'E' }],
      attachments: [{ id: 0, filename: 'a.png' }],
      flags: 4096,
    });
    store.actions.setMode('poll');
    expect(store.toJSON()).toEqual({
      flags: 4096,
      poll: { ...createPoll(), question: { text: 'Patch notes' } },
    });
    expect(store.checkInsert('embed', { parentId: null, slot: 'embeds' }).ok).toBe(false);
    expect(store.allowedTemplates({ parentId: null, slot: 'components' })).toEqual([]);
    store.actions.undo();
    expect(store.toJSON().embeds).toHaveLength(1);
    expect(store.toJSON().content).toBe('## Patch notes\nMore below');
  });

  it('switching away writes the poll out as text', () => {
    const doc = fromJSON({ poll: POLL });
    expect(toJSON(setMode(doc, 'classic')).content).toBe('**Which map next?**\n- 🔥 Harbor\n- Desert');
    const cv2 = toJSON(setMode(doc, 'cv2'));
    expect(cv2.components).toEqual([{ type: 10, content: '**Which map next?**\n- 🔥 Harbor\n- Desert' }]);
    expect(cv2.poll).toBeUndefined();
    expect(toJSON(setMode(doc, 'classic', { convert: false }))).toEqual({});
  });
});

describe('poll restrictions', () => {
  it('poll is a mode, and message.poll: false still turns it off', () => {
    expect(allowedModes(undefined)).toEqual(['classic', 'cv2', 'poll']);
    expect(allowedModes({ modes: ['poll'] })).toEqual(['poll']);
    expect(allowedModes({ message: { poll: false } })).toEqual(['classic', 'cv2']);
    expect(allowedModes(restrictionPresets.textOnly)).toEqual(['classic', 'cv2']);
    expect(isMessageFieldAllowed({ modes: ['classic'] }, 'poll')).toBe(false);
    expect(mergeRestrictions({ modes: ['classic', 'poll'] }, { modes: ['poll', 'cv2'] }).modes).toEqual(['poll']);
  });

  it('reports and removes a poll a builder doesn’t allow', () => {
    const doc = fromJSON({ poll: POLL });
    const issues = validateDocument(doc, { restrictions: { modes: ['classic', 'cv2'] } });
    expect(issues.some((issue) => issue.code === 'MODE_NOT_ALLOWED' && issue.restricted)).toBe(true);
    const clean = sanitize(doc, { modes: ['classic'] });
    expect(clean.mode).toBe('classic');
    expect(clean.poll).toBeUndefined();
    expect(clean.content).toContain('Which map next?');
  });

  it('a poll-only builder starts with a poll to fill in', () => {
    const store = createBuilderStore(null, { restrictions: { modes: ['poll'] } });
    expect(store.getState().doc.mode).toBe('poll');
    expect(store.toJSON().poll).toEqual(createPoll());
  });
});

describe('target', () => {
  it('is an option of the builder: bots validate against Create Message', () => {
    const payload = { content: 'Hi', username: 'Hook', flags: 1 << 6 };
    const webhook = createBuilderStore(payload);
    expect(webhook.getTarget()).toBe('webhook');
    expect(webhook.getIssues().some((issue) => issue.path[0] === 'flags')).toBe(true);
    const bot = createBuilderStore(payload, { target: 'interaction' });
    expect(bot.getTarget()).toBe('interaction');
    // Ephemeral is fine in an interaction response; a username override isn't taken.
    expect(bot.getIssues().some((issue) => issue.path[0] === 'flags')).toBe(false);
    expect(bot.getIssues().some((issue) => issue.path[0] === 'username')).toBe(true);
    bot.setOptions({ target: 'message' });
    expect(bot.getIssues().some((issue) => issue.path[0] === 'flags')).toBe(true);
  });
});
