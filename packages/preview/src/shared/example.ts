// The demo preview (`/p/demo`) and the request body the docs show. Media lives on this site's own origin,
// as a creator's would live on their CDN.

const WUMPUS = {
  id: '1000000000000000001',
  username: 'wumpus',
  global_name: 'Wumpus',
  avatar: null,
  avatar_url: '{{origin}}/example/avatar.png',
};

const HELPER = {
  id: '1000000000000000002',
  username: 'Helper',
  global_name: null,
  avatar: null,
  bot: true,
  avatar_url: '{{origin}}/example/icon.png',
};

const NELLY = {
  id: '1000000000000000003',
  username: 'nelly',
  global_name: 'Nelly',
  avatar: null,
};

export const EXAMPLE_MESSAGES = [
  {
    id: '1310000000000000001',
    author: WUMPUS,
    content: 'Hey! My preview embeds are showing the wrong colours since yesterday.',
    timestamp: '2026-11-25T16:02:00.000Z',
  },
  {
    id: '1310000000000000002',
    author: WUMPUS,
    content: 'Here is a screenshot of what I see:',
    timestamp: '2026-11-25T16:02:40.000Z',
    attachments: [
      {
        id: '1310000000000000100',
        filename: 'screenshot.png',
        size: 140222,
        url: '{{origin}}/example/landscape.png',
        proxy_url: '{{origin}}/example/landscape.png',
        // Declared smaller than the file so it shows at a modest size, as a resized upload would.
        width: 400,
        height: 225,
        content_type: 'image/png',
      },
    ],
  },
  {
    id: '1310000000000000003',
    author: HELPER,
    content: '',
    timestamp: '2026-11-25T16:03:05.000Z',
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: 5793266,
        components: [
          {
            type: 9,
            components: [
              { type: 10, content: 'Ticket #1042 opened' },
              { type: 10, content: 'A staff member will be with you shortly. Meanwhile, pick a category.' },
            ],
            accessory: {
              type: 11,
              media: { url: '{{origin}}/example/thumbnail.png', width: 160, height: 160 },
              description: 'Ticket icon',
            },
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: 'category',
                placeholder: 'Choose a category',
                options: [
                  { label: 'Rendering', value: 'rendering', description: 'Colours, layout, fonts' },
                  { label: 'Billing', value: 'billing' },
                ],
              },
            ],
          },
          {
            type: 1,
            components: [
              { type: 2, style: 3, label: 'Claim', custom_id: 'claim' },
              { type: 2, style: 4, label: 'Close ticket', custom_id: 'close' },
              { type: 2, style: 5, label: 'Docs', url: 'https://example.com/docs' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: '1310000000000000004',
    author: NELLY,
    content: 'Thanks for the screenshot! That was a caching bug on our side, it is fixed now.',
    timestamp: '2026-11-26T09:14:00.000Z',
    type: 19,
    message_reference: { message_id: '1310000000000000002', channel_id: '1300000000000000000' },
    referenced_message: {
      id: '1310000000000000002',
      channel_id: '1300000000000000000',
      author: WUMPUS,
      content: 'Here is a screenshot of what I see:',
      timestamp: '2026-11-25T16:02:40.000Z',
      edited_timestamp: null,
      type: 0,
    },
  },
  {
    id: '1310000000000000005',
    author: NELLY,
    content: '',
    timestamp: '2026-11-26T09:14:30.000Z',
    embeds: [
      {
        type: 'rich',
        title: 'Release notes: 2.4.1',
        url: 'https://example.com/changelog',
        description: 'Embed colours now follow the theme you pick in the URL.',
        color: 5793266,
        fields: [
          { name: 'Fixed', value: 'Stale colour cache', inline: true },
          { name: 'Affected', value: 'Previews since 2.4.0', inline: true },
        ],
        footer: { text: 'discord-mana preview' },
        timestamp: '2026-11-26T09:00:00.000Z',
      },
    ],
    reactions: [
      { count: 3, me: false, emoji: { id: null, name: '🎉' } },
      { count: 1, me: true, emoji: { id: null, name: '👍' } },
    ],
  },
  {
    id: '1310000000000000006',
    author: WUMPUS,
    content: 'Confirmed, all good now. Thank you!',
    timestamp: '2026-11-26T09:20:10.000Z',
  },
];

export const withOrigin = <T>(value: T, origin: string): T =>
  JSON.parse(JSON.stringify(value).replaceAll('{{origin}}', origin)) as T;
