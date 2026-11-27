import { Suspense, use, useEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { Clickable, scrollbarStyles } from '@discord-mana/components';
import { CheckmarkLargeIcon, CopyIcon } from '@discord-mana/icons';
import { markupStyles } from '@discord-mana/messages';
import { ANSI_COLORS, ansiStyle, parseAnsi } from '../ansi';
import { highlightCode, loadCodeGrammar, normalizeCodeLanguage } from '../highlight';
import highlightStyles from './CodeHighlight.module.css';
import revealStyles from './HighlightReveal.module.css';
import './hljs.css';

const canCopy = typeof window !== 'undefined' && typeof window.navigator?.clipboard?.writeText === 'function';

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);
  const copy = () => {
    window.navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        clearTimeout(timer.current ?? undefined);
        timer.current = setTimeout(() => setCopied(false), 2000);
      },
      () => setCopied(false),
    );
  };
  return (
    <Clickable onClick={copy}>
      {copied ? <CheckmarkLargeIcon size="xs" color="currentColor" /> : <CopyIcon size="xs" color="currentColor" />}
    </Clickable>
  );
};

CopyButton.displayName = 'CopyButton';

type CodeProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & { code: string };

const PlainCode = ({ code, ...props }: CodeProps) => <code {...props}>{code}</code>;

PlainCode.displayName = 'PlainCode';

const AnsiCode = ({
  code,
  className,
  highlightedClassName,
  ...props
}: CodeProps & { highlightedClassName?: string }) => {
  const segments = useMemo(() => parseAnsi(code), [code]);
  return (
    <code className={clsx(className, highlightStyles.ansi, highlightedClassName)} {...props}>
      {segments.map((segment, i) => (
        <span key={i} style={ansiStyle(segment, ANSI_COLORS) as CSSProperties | undefined}>
          {segment.value}
        </span>
      ))}
    </code>
  );
};

AnsiCode.displayName = 'AnsiCode';

const HighlightedCode = ({
  code,
  lang,
  className,
  highlightedClassName,
  ...props
}: CodeProps & { lang: string; highlightedClassName?: string }) => {
  // Suspends until the language's grammar has loaded, like the client.
  use(loadCodeGrammar(lang));
  const html = use(highlightCode(lang, code));
  if (html == null) return <PlainCode code={code} className={className} {...props} />;
  return (
    <code
      {...props}
      className={clsx(className, `language-${lang}`, highlightedClassName)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

HighlightedCode.displayName = 'HighlightedCode';

export interface HighlightedCodeBlockProps extends CodeProps {
  lang?: string;
  /** Added once the highlighted HTML is shown (the client fades the colors in). */
  highlightedClassName?: string;
}

/** A code element with the language's syntax highlighting, plain until its grammar has loaded. */
export const HighlightedCodeBlock = ({ code, lang, highlightedClassName, ...props }: HighlightedCodeBlockProps) => {
  const language = useMemo(() => normalizeCodeLanguage(lang), [lang]);
  if (language == null) return <PlainCode code={code} {...props} />;
  return (
    <Suspense fallback={<PlainCode code={code} {...props} />}>
      {language === 'ansi' ? (
        <AnsiCode code={code} highlightedClassName={highlightedClassName} {...props} />
      ) : (
        <HighlightedCode code={code} lang={language} highlightedClassName={highlightedClassName} {...props} />
      )}
    </Suspense>
  );
};

HighlightedCodeBlock.displayName = 'HighlightedCodeBlock';

export interface CodeBlockProps {
  content: string;
  lang?: string;
}

/** A fenced code block: highlighted code and a copy button. */
export const CodeBlock = ({ content, lang }: CodeBlockProps) => (
  <pre>
    <div className={markupStyles.codeContainer}>
      {canCopy ? (
        <div className={markupStyles.codeActions}>
          <CopyButton text={content} />
        </div>
      ) : null}
      <HighlightedCodeBlock
        code={content}
        lang={lang}
        className={clsx(scrollbarStyles.scrollbarGhostHairline, 'hljs')}
        highlightedClassName={revealStyles.arboriumHighlightReveal}
      />
    </div>
  </pre>
);

CodeBlock.displayName = 'CodeBlock';
