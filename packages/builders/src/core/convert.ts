// Best-effort conversion between classic messages, Components v2 and polls, used by `setMode`.
import { createPoll, createUid } from './json';
import type {
  ActionRowNode,
  APIPollCreateRequest,
  BuilderDocument,
  BuilderMode,
  ButtonNode,
  ContainerChildNode,
  EmbedNode,
  TextDisplayNode,
  TopLevelComponentNode,
} from './types';

const text = (content: string): TextDisplayNode => ({ uid: createUid(), type: 10, content });

const link = (label: string, url: string | undefined) => (url ? `[${label}](${url})` : label);

const discordTimestamp = (iso: string) => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : `<t:${Math.floor(time / 1000)}:f>`;
};

/** An embed as a container: author/title/description (beside the thumbnail), fields, image, footer. */
export const embedToContainer = (embed: EmbedNode): TopLevelComponentNode | null => {
  const children: ContainerChildNode[] = [];
  const head = [
    embed.author?.name ? `-# ${link(embed.author.name, embed.author.url)}` : null,
    embed.title ? `### ${link(embed.title, embed.url)}` : null,
    embed.description || null,
  ]
    .filter((line): line is string => line != null)
    .join('\n');
  const thumbnail = embed.thumbnail?.url;
  if (head && thumbnail) {
    children.push({
      uid: createUid(),
      type: 9,
      components: [text(head)],
      accessory: { uid: createUid(), type: 11, media: { url: thumbnail } },
    });
  } else if (head) children.push(text(head));
  else if (thumbnail) {
    children.push({ uid: createUid(), type: 12, items: [{ uid: createUid(), media: { url: thumbnail } }] });
  }
  const fields = embed.fields
    .filter((field) => field.name || field.value)
    .map((field) => `**${field.name}**\n${field.value}`)
    .join('\n\n');
  if (fields) children.push(text(fields));
  if (embed.image?.url) {
    children.push({ uid: createUid(), type: 12, items: [{ uid: createUid(), media: { url: embed.image.url } }] });
  }
  const footer = [embed.footer?.text, embed.timestamp ? discordTimestamp(embed.timestamp) : null]
    .filter(Boolean)
    .join(' • ');
  if (footer) children.push(text(`-# ${footer}`));
  if (children.length === 0) return null;
  return {
    uid: createUid(),
    type: 17,
    ...(embed.color != null ? { accent_color: embed.color } : {}),
    components: children,
  };
};

export const convertToCV2 = (doc: BuilderDocument): BuilderDocument => {
  const components: TopLevelComponentNode[] = [];
  if (doc.content.trim()) components.push(text(doc.content));
  for (const embed of doc.embeds) {
    const container = embedToContainer(embed);
    if (container) components.push(container);
  }
  components.push(...doc.components);
  const { poll: _poll, sticker_ids: _stickers, ...rest } = doc;
  return { ...rest, mode: 'cv2', content: '', embeds: [], components };
};

const HEADING = /^#{1,3} (.+)$/;
const SUBTEXT = /^-# (.+)$/;
const LINK = /^\[(.+)\]\((\S+)\)$/;

const parseLink = (value: string) => {
  const match = LINK.exec(value);
  return match ? { label: match[1], url: match[2] } : { label: value, url: undefined };
};

/** A container as an embed: accent color, text as title/description/footer, first thumbnail and image. */
const containerToEmbed = (
  container: Extract<TopLevelComponentNode, { type: 17 }>,
  buttons: ButtonNode[],
  rows: ActionRowNode[],
): EmbedNode => {
  const embed: EmbedNode = { uid: createUid(), fields: [] };
  if (container.accent_color != null) embed.color = container.accent_color;
  const texts: string[] = [];
  for (const child of container.components) {
    if (child.type === 10) texts.push((child as TextDisplayNode).content);
    else if (child.type === 9) {
      const section = child as Extract<ContainerChildNode, { type: 9 }>;
      texts.push(...section.components.map((display) => display.content));
      if (section.accessory?.type === 11 && !embed.thumbnail) embed.thumbnail = { url: section.accessory.media.url };
      else if (section.accessory?.type === 2) buttons.push(section.accessory as ButtonNode);
    } else if (child.type === 12) {
      const [first] = (child as Extract<ContainerChildNode, { type: 12 }>).items;
      if (first && !embed.image) embed.image = { url: first.media.url };
    } else if (child.type === 1) rows.push(child as ActionRowNode);
  }
  const lines = texts.join('\n\n').split('\n');
  const author = SUBTEXT.exec(lines[0] ?? '');
  if (author && lines.length > 1) {
    const { label, url } = parseLink(author[1]);
    embed.author = { name: label, ...(url ? { url } : {}) };
    lines.shift();
  }
  const title = HEADING.exec(lines[0] ?? '');
  if (title) {
    const { label, url } = parseLink(title[1]);
    embed.title = label;
    if (url) embed.url = url;
    lines.shift();
  }
  const footer = SUBTEXT.exec(lines[lines.length - 1] ?? '');
  if (footer && lines.length > 0) {
    embed.footer = { text: footer[1] };
    lines.pop();
  }
  const description = lines.join('\n').trim();
  if (description) embed.description = description;
  return embed;
};

export const convertToClassic = (doc: BuilderDocument): BuilderDocument => {
  const content: string[] = [];
  const embeds: EmbedNode[] = [];
  const rows: ActionRowNode[] = [];
  const buttons: ButtonNode[] = [];
  if (doc.content.trim()) content.push(doc.content);
  for (const node of doc.components) {
    switch (node.type) {
      case 1:
        rows.push(node as ActionRowNode);
        break;
      case 10:
        content.push((node as TextDisplayNode).content);
        break;
      case 9: {
        const section = node as Extract<TopLevelComponentNode, { type: 9 }>;
        content.push(...section.components.map((display) => display.content));
        if (section.accessory?.type === 2) buttons.push(section.accessory as ButtonNode);
        break;
      }
      case 12:
        for (const item of (node as Extract<TopLevelComponentNode, { type: 12 }>).items) {
          embeds.push({ uid: createUid(), image: { url: item.media.url }, fields: [] });
        }
        break;
      case 17:
        embeds.push(containerToEmbed(node as Extract<TopLevelComponentNode, { type: 17 }>, buttons, rows));
        break;
    }
  }
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push({ uid: createUid(), type: 1, components: buttons.slice(i, i + 5) });
  }
  return { ...doc, mode: 'classic', content: content.join('\n'), embeds: [...doc.embeds, ...embeds], components: rows };
};

// Polls. A poll message has nothing but the poll, so switching to one keeps a question (the first line of the
// text) and drops the rest (undo brings it back); switching away writes the poll out as text.

const plainLine = (line: string) =>
  line
    .replace(/^(#{1,3}|-#|>) /, '')
    .replace(/\*\*|__|~~|`/g, '')
    .trim();

const firstLine = (doc: BuilderDocument) => {
  const texts = [
    doc.content,
    ...doc.embeds.map((embed) => embed.title ?? embed.description ?? ''),
    ...doc.components.flatMap(function collect(node): string[] {
      if (node.type === 10) return [(node as TextDisplayNode).content];
      const children = (node as { components?: TopLevelComponentNode[] }).components;
      return Array.isArray(children) ? children.flatMap(collect) : [];
    }),
  ];
  for (const value of texts) {
    const line = value
      .split('\n')
      .map(plainLine)
      .find((candidate) => candidate !== '');
    if (line != null) return line.slice(0, 300);
  }
  return '';
};

export const convertToPoll = (doc: BuilderDocument): BuilderDocument => {
  const { attachments: _attachments, sticker_ids: _stickers, tts: _tts, poll, ...rest } = doc;
  const base = poll ?? createPoll();
  const question = base.question?.text || firstLine(doc);
  return {
    ...rest,
    mode: 'poll',
    content: '',
    embeds: [],
    components: [],
    poll: { ...base, question: { ...base.question, text: question } },
  };
};

/** The poll as markdown: the question in bold, then one line per answer. */
export const pollToMarkdown = (poll: APIPollCreateRequest | undefined) => {
  if (poll == null) return '';
  const lines = poll.question?.text ? [`**${poll.question.text}**`] : [];
  for (const answer of poll.answers ?? []) {
    const media = answer.poll_media;
    const emoji =
      media?.emoji?.id != null
        ? `<:${media.emoji.name ?? '_'}:${media.emoji.id}> `
        : media?.emoji?.name
          ? `${media.emoji.name} `
          : '';
    if (media?.text || emoji) lines.push(`- ${emoji}${media?.text ?? ''}`);
  }
  return lines.join('\n');
};

const pollToClassic = (doc: BuilderDocument): BuilderDocument => {
  const { poll, ...rest } = doc;
  const text = [pollToMarkdown(poll), doc.content].filter((part) => part.trim() !== '').join('\n\n');
  return { ...rest, mode: 'classic', content: text };
};

/** Converts a message to another mode, keeping what the new mode can show. */
export const convertToMode = (doc: BuilderDocument, mode: BuilderMode): BuilderDocument => {
  if (doc.mode === mode) return doc;
  if (mode === 'poll') return convertToPoll(doc);
  const from = doc.mode === 'poll' ? pollToClassic(doc) : doc;
  if (from.mode === mode) return from;
  return mode === 'cv2' ? convertToCV2(from) : convertToClassic(from);
};
