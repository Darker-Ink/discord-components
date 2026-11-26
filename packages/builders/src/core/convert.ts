// Best-effort conversion between classic messages and Components v2, used by `setMode`.
import { createUid } from './json';
import type {
  ActionRowNode,
  BuilderDocument,
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

/** A container as an embed: accent colour, text as title/description/footer, first thumbnail and image. */
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
