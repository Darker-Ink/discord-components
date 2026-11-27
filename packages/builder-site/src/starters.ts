import type { WebhookMessagePayload } from '@discord-mana/builders';

// What "New" can start from.

const IS_COMPONENTS_V2 = 1 << 15;

export const EXAMPLE: WebhookMessagePayload = {
  content: 'Patch notes for this week are up.',
  embeds: [
    {
      title: 'Update 2.4',
      description:
        'Faster matchmaking, a new map and a round of balance changes.\n\nServers restart at **09:00 UTC** and should be back within 15 minutes.',
      color: 0x5865f2,
      fields: [
        { name: 'New', value: '• Harbor map\n• Ranked seasons', inline: true },
        { name: 'Fixed', value: '• Crash on load\n• Expiring party invites', inline: true },
      ],
      footer: { text: 'Release team' },
    },
  ],
  components: [
    {
      type: 1,
      components: [
        { type: 2, style: 5, label: 'Full patch notes', url: 'https://example.com/patch-notes/2-4' },
        { type: 2, style: 5, label: 'Report a bug', url: 'https://example.com/bugs' },
      ],
    },
  ],
};

export const EXAMPLE_CV2: WebhookMessagePayload = {
  flags: IS_COMPONENTS_V2,
  components: [
    {
      type: 17,
      accent_color: 0x5865f2,
      components: [
        { type: 10, content: '## Update 2.4\nFaster matchmaking, a new map and a round of balance changes.' },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 9,
          components: [{ type: 10, content: '**Harbor** joins the map rotation this week.' }],
          accessory: { type: 2, style: 5, label: 'View map', url: 'https://example.com/maps/harbor' },
        },
        {
          type: 9,
          components: [{ type: 10, content: '**Ranked seasons** start on Friday.' }],
          accessory: { type: 2, style: 5, label: 'Season info', url: 'https://example.com/ranked' },
        },
        { type: 10, content: '-# Servers restart at 09:00 UTC' },
      ],
    },
  ],
};

export const BLANK: WebhookMessagePayload = { content: '' };

export const BLANK_CV2: WebhookMessagePayload = { flags: IS_COMPONENTS_V2, components: [] };

/** A poll message: a poll and nothing else. */
export const POLL: WebhookMessagePayload = {
  poll: {
    question: { text: 'Which map should we add next?' },
    answers: [
      { poll_media: { text: 'Harbor', emoji: { name: '⚓' } } },
      { poll_media: { text: 'Desert outpost', emoji: { name: '🏜️' } } },
      { poll_media: { text: 'Glacier', emoji: { name: '🧊' } } },
    ],
    duration: 72,
    allow_multiselect: false,
  },
};
