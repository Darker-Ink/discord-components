import type { WebhookMessagePayload } from '@discord-mana/builders';

// What "New" can start from. The example teaches the editor by being edited.

const IS_COMPONENTS_V2 = 1 << 15;

export const EXAMPLE: WebhookMessagePayload = {
  content: 'This is a real Discord message. Click any of its text to change it.',
  embeds: [
    {
      title: 'Edit where it renders',
      description:
        'Titles, descriptions and fields are edited in place, with Discord’s markdown: **bold**, *italics*, `code`, ||spoilers|| and more.\n\nSelect this embed to give it an author, image, thumbnail, footer or timestamp, or click its colour bar.',
      color: 0x5865f2,
      fields: [
        { name: 'Drag to reorder', value: 'Embeds, fields, buttons and components.', inline: true },
        { name: 'Checked as you type', value: 'Against every limit Discord enforces.', inline: true },
      ],
      footer: { text: 'Saved in this browser as you go' },
    },
  ],
  components: [
    {
      type: 1,
      components: [
        { type: 2, style: 5, label: 'Discord’s docs', url: 'https://discord.com/developers/docs/resources/message' },
        { type: 2, style: 5, label: 'discord-mana', url: 'https://discord-mana.dev' },
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
        { type: 10, content: '## Components v2\nLay out text, images and buttons in containers and sections.' },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 9,
          components: [{ type: 10, content: '**Sections** put a thumbnail or a button beside their text.' }],
          accessory: {
            type: 2,
            style: 5,
            label: 'Read the docs',
            url: 'https://discord.com/developers/docs/components/reference',
          },
        },
        { type: 10, content: '-# Drag components in from the left, or click one to add it after the selection.' },
      ],
    },
  ],
};

export const BLANK: WebhookMessagePayload = { content: '' };

export const BLANK_CV2: WebhookMessagePayload = { flags: IS_COMPONENTS_V2, components: [] };
