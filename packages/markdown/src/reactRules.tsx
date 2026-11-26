/* eslint-disable @typescript-eslint/no-explicit-any */
import { cloneElement, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import { HiddenVisually } from '@discord-mana/components';
import { ChatIcon } from '@discord-mana/icons';
import {
  MaskedLink,
  ObscuredContent,
  markupStyles,
  useMessageActions,
  useMessageResolvers,
} from '@discord-mana/messages';
import { astToString } from './ast';
import { CodeBlock } from './components/CodeBlock';
import { MarkupCustomEmoji, MarkupUnicodeEmoji } from './components/MarkupEmoji';
import { MarkupTimestamp } from './components/MarkupTimestamp';
import {
  AttachmentLink,
  ChannelWithIcon,
  GuildMention,
  Mention,
  MentionChevron,
  RoleMention,
  UserMention,
} from './components/Mention';
import messageIconStyles from './components/MessageIcon.module.css';
import type { MarkdownRules } from './rules';
import { reactElement, type ASTNode, type ReactOutput } from './simpleMarkdown';
import { DEFAULT_MARKDOWN_STRINGS, type MarkdownState } from './state';

// The client's React output for each rule: the markup classes, mention pills, emoji, spoilers and code blocks.

/** Outputs a node's content, which may be a string or nested nodes. */
const outputContent = (node: ASTNode, output: ReactOutput, state: MarkdownState) =>
  typeof node.content === 'string' || node.content === undefined ? node.content : output(node.content, state);

const strings = (state: MarkdownState) => state.strings ?? DEFAULT_MARKDOWN_STRINGS;

export interface ReactRuleOptions {
  /** Where emoji tooltips open. */
  emojiTooltipPosition?: 'top' | 'bottom';
  /** Clicking an emoji opens its details. */
  enableEmojiClick?: boolean;
  emojiFocusable?: boolean;
  /** Clicks on mentions, links and emoji don't bubble (channel topics, popouts). */
  shouldStopPropagation?: boolean;
  /** External links ask for confirmation first (profile bios). */
  mustConfirmExternalLink?: boolean;
}

const stopPropagation = (event: MouseEvent) => event.stopPropagation();
const INLINE_STYLE = { display: 'inline' };

/** Wraps a rule's output in a span that keeps clicks from reaching the message. */
export const withStoppedPropagation = (rule: any) => ({
  ...rule,
  react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
    <span style={INLINE_STYLE} onClick={stopPropagation} key={state.key}>
      {rule.react(node, output, state)}
    </span>
  ),
});

const ChannelMentionPill = ({
  node,
  output,
  state,
  options,
}: {
  node: ASTNode;
  output: ReactOutput;
  state: MarkdownState;
  options: ReactRuleOptions;
}) => {
  const actions = useMessageActions();
  const onClick = state.noStyleAndInteraction
    ? undefined
    : (event: MouseEvent<HTMLElement>) => {
        if (options.shouldStopPropagation) event?.stopPropagation();
        actions.onMarkdownInteraction?.({
          type: 'channel',
          guildId: node.guildId ?? null,
          channelId: node.channelId ?? null,
          messageId: node.messageId ?? null,
          event,
        });
      };
  return (
    <Mention role="link" onClick={onClick} className="channelMention">
      {node.inContent != null ? output(node.inContent, state) : null}
      {node.inContent != null ? <MentionChevron /> : null}
      {outputContent(node, output, state)}
    </Mention>
  );
};

const CommandMentionPill = ({
  node,
  stateKey,
  children,
}: {
  node: ASTNode;
  stateKey?: string | number;
  children: ReactNode;
}) => {
  const resolvers = useMessageResolvers();
  const actions = useMessageActions();
  const command = resolvers.resolveCommand?.(node.commandId, node.commandName);
  const usable = command != null && command.name === node.commandName;
  return usable ? (
    <Mention
      key={stateKey}
      role="link"
      onClick={(event) => {
        event?.stopPropagation();
        actions.onMarkdownInteraction?.({
          type: 'command',
          commandId: node.commandId,
          commandName: node.commandName,
          event,
        });
      }}
    >
      /{children}
    </Mention>
  ) : (
    <span>/{children}</span>
  );
};

const StaticRouteLinkPill = ({ node, output, state }: { node: ASTNode; output: ReactOutput; state: MarkdownState }) => {
  const actions = useMessageActions();
  return (
    <Mention
      role="link"
      onClick={(event) =>
        actions.onMarkdownInteraction?.({
          type: 'staticRoute',
          guildId: node.guildId ?? null,
          route: node.id,
          itemId: node.itemId ?? null,
          event,
        })
      }
      className="channelMention"
      iconType={node.id}
    >
      {output(node.mainContent, state)}
      {node.itemContent != null ? <MentionChevron /> : null}
      {node.itemContent != null ? output(node.itemContent, state) : null}
    </Mention>
  );
};

const GuildMentionNode = ({ node, children }: { node: ASTNode; children: ReactNode }) => {
  const resolvers = useMessageResolvers();
  return <GuildMention guild={resolvers.resolveGuild?.(node.guildId) ?? null}>{children}</GuildMention>;
};

const isStaticRoute = (id: string) =>
  id === 'home' || id === 'browse' || id === 'customize' || id === 'guide' || id === 'linked-roles';

// Links inside a hidden spoiler aren't tab stops.
const renderSpoilerElement = (element: ReactElement, visible: boolean) =>
  element == null || element.type !== MarkdownLink || visible
    ? element
    : cloneElement(element as ReactElement<{ tabIndex?: number }>, { tabIndex: -1 });

/** The React side of the client's markdown rules (`createReactRules`). */
export const createReactRules = (options: ReactRuleOptions = {}): MarkdownRules => {
  const { emojiTooltipPosition = 'top', enableEmojiClick = true, emojiFocusable = true } = options;
  const wrap = (rule: any) => (options.shouldStopPropagation === true ? withStoppedPropagation(rule) : rule);
  return {
    blockQuote: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
        <div className={markupStyles.blockquoteContainer} key={state.key}>
          <div className={markupStyles.blockquoteDivider} />
          <blockquote>{output(node.content, state)}</blockquote>
        </div>
      ),
    },
    s: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
        <s key={state.key}>{output(node.content, state)}</s>
      ),
    },
    highlight: {
      react: (node: ASTNode, _output: ReactOutput, state: MarkdownState) => (
        <span className="highlight" key={state.key}>
          {node.content}
        </span>
      ),
    },
    paragraph: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
        <p key={state.key}>{output(node.content, state)}</p>
      ),
    },
    inlineCode: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
        <code className="inline" key={state.key}>
          {outputContent(node, output, state)}
        </code>
      ),
    },
    codeBlock: {
      react: (node: ASTNode, _output: ReactOutput, state: MarkdownState) => (
        <CodeBlock key={state.key} content={node.content} lang={node.lang} />
      ),
    },
    text: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) =>
        typeof node.content === 'string' ? (
          <span key={state.key}>{node.content}</span>
        ) : (
          <span key={state.key}>{output(node.content, state)}</span>
        ),
    },
    spoiler: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
        <ObscuredContent
          key={state.key}
          type={ObscuredContent.Types.TEXT}
          inline={state.formatInline}
          renderTextElement={renderSpoilerElement}
        >
          {() => output(node.content, state)}
        </ObscuredContent>
      ),
    },
    staticRouteLink: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) =>
        isStaticRoute(node.id) ? (
          <StaticRouteLinkPill key={state.key} node={node} output={output} state={state} />
        ) : null,
    },
    timestamp: {
      react: (node: ASTNode, _output: ReactOutput, state: MarkdownState) => (
        <MarkupTimestamp key={state.key} node={node as any} />
      ),
    },
    list: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => {
        const tag = node.ordered ? 'ol' : 'ul';
        const totalCharacters =
          node.start == null ? undefined : (node.start + (node.items.length - 1)).toString().length;
        return reactElement(tag, `${state.key}`, {
          start: node.start,
          className: state.formatInline ? markupStyles.inlineFormat : null,
          style: {
            '--totalCharacters': totalCharacters,
            '--olCounterStart': node.start == null ? undefined : node.start - 1,
          },
          children: node.items.map((item: ASTNode[], i: number) => {
            const inner = reactElement('span', `${state.key}-${i}-innerSpan`, { children: output(item, state) });
            return reactElement('li', `${state.key}-${i}` + i, {
              children: [inner, <HiddenVisually key="screen-reader-pause">,</HiddenVisually>],
            });
          }),
        });
      },
    },
    heading: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => {
        const inner = reactElement('span', `${state.key}-innerSpan`, { children: output(node.content, state) });
        return reactElement('h' + node.level, state?.key != null ? `${state.key}` : null, {
          children: [inner, <HiddenVisually key="screen-reader-pause">,</HiddenVisually>],
          className: state.formatInline ? markupStyles.inlineFormat : null,
        });
      },
    },
    guild: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
        <GuildMentionNode key={state.key} node={node}>
          {outputContent(node, output, state)}
        </GuildMentionNode>
      ),
    },
    channel: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
        <ChannelWithIcon key={state.key} iconType={node.iconType} strings={strings(state)}>
          {outputContent(node, output, state)}
        </ChannelWithIcon>
      ),
    },
    message: {
      react: (_node: ASTNode, _output: ReactOutput, state: MarkdownState) => (
        <ChatIcon
          key={state.key}
          size="md"
          color="currentColor"
          className={messageIconStyles.icon}
          aria-label={strings(state).MESSAGE}
        />
      ),
    },
    subtext: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => {
        const inner = reactElement('span', `${state.key}-innerSpan`, { children: output(node.content, state) });
        return reactElement('small', state?.key != null ? `${state.key}` : null, {
          children: inner,
          className: state.formatInline ? markupStyles.inlineFormat : null,
        });
      },
    },
    silentPrefix: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) =>
        typeof node.content === 'string' ? (
          <span key={state.key}>{node.content}</span>
        ) : (
          <span key={state.key}>{output(node.content, state)}</span>
        ),
    },
    link: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
        <MarkdownLink key={state.key} node={node} output={output} state={state} options={options} />
      ),
    },
    emoji: wrap({
      react: (node: ASTNode, _output: ReactOutput, state: MarkdownState) =>
        node.src ? (
          <MarkupUnicodeEmoji
            key={state.key}
            node={node as any}
            tooltipPosition={emojiTooltipPosition}
            enableClick={enableEmojiClick}
            focusable={emojiFocusable}
            channelId={state.channelId}
            messageId={state.messageId}
            strings={strings(state)}
          />
        ) : (
          <span key={state.key}>{node.surrogate}</span>
        ),
    }),
    customEmoji: wrap({
      react: (node: ASTNode, _output: ReactOutput, state: MarkdownState) => (
        <MarkupCustomEmoji
          key={state.key}
          node={node as any}
          tooltipPosition={emojiTooltipPosition}
          enableClick={enableEmojiClick}
          focusable={emojiFocusable}
          channelId={state.channelId}
          messageId={state.messageId}
          strings={strings(state)}
        />
      ),
    }),
    channelMention: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
        <ChannelMentionPill key={state.key} node={node} output={output} state={state} options={options} />
      ),
    },
    commandMention: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
        <CommandMentionPill key={state.key} node={node} stateKey={state.key}>
          {output(node.content, state)}
        </CommandMentionPill>
      ),
    },
    attachmentLink: {
      react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => (
        <AttachmentLink key={state.key} href={node.attachmentUrl} noStyleAndInteraction={state.noStyleAndInteraction}>
          {outputContent(node, output, state)}
        </AttachmentLink>
      ),
    },
  };
};

/** User, role, `@everyone` and `@here` mentions. */
export const mentionReactRule = {
  react: (node: ASTNode, output: ReactOutput, state: MarkdownState) => {
    const { userId, channelId, parsedUserId, roleId, roleName, viewingChannelId } = node;
    return userId == null && (roleId != null || roleName === '@everyone' || roleName === '@here') ? (
      <RoleMention key={state.key} inlinePreview={state.noStyleAndInteraction} {...(node as any)}>
        {output(node.content, state)}
      </RoleMention>
    ) : (
      <UserMention
        key={state.key}
        className="mention"
        userId={userId}
        channelId={channelId}
        viewingChannelId={viewingChannelId}
        parsedUserId={parsedUserId}
        content={output(node.content, state)}
        inlinePreview={state.noStyleAndInteraction}
      />
    );
  },
};

const MarkdownLink = ({
  node,
  output,
  state,
  options,
  tabIndex,
}: {
  node: ASTNode;
  output: ReactOutput;
  state: MarkdownState;
  options: ReactRuleOptions;
  tabIndex?: number;
}) => {
  const actions = useMessageActions();
  const children = output(node.content, state);
  let title: string =
    typeof node.title === 'string' && node.title.length !== 0 ? node.title : astToString(node.content);
  const trusted =
    node.target != null &&
    node.target === (node.title != null && node.title !== '' ? node.title : astToString(node.content));
  if (state.previewLinkTarget && !trusted) {
    let suffix = `\n\n(${node.target})`;
    if (title.length + suffix.length > 1024) {
      suffix = '...' + suffix;
      title = title.substr(0, 1024 - suffix.length).trimEnd();
    }
    title += suffix;
  }
  if (state.noStyleAndInteraction) return <span title={title}>{children}</span>;
  return (
    <MaskedLink
      {...(tabIndex != null ? { tabIndex } : null)}
      title={title}
      href={node.target}
      trusted={trusted}
      messageId={state.messageId}
      channelId={state.channelId}
      onClick={(event) => {
        if (options.mustConfirmExternalLink) {
          event?.stopPropagation();
          event?.preventDefault();
        }
        actions.onMarkdownInteraction?.({ type: 'link', href: node.target, event });
      }}
    >
      {children}
    </MaskedLink>
  );
};

MarkdownLink.displayName = 'MarkdownLink';
