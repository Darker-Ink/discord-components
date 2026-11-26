import { useEffect, useState, useSyncExternalStore } from 'react';
import clsx from 'clsx';
import { Clickable } from '@discord-mana/components';
import { CheckmarkSmallIcon, CopyIcon } from '@discord-mana/icons';
import { copyText } from './clipboard';
import { highlight } from './highlight';
import styles from './Site.module.css';

export interface CodeSample {
  /** Tab label, e.g. "curl" or "JavaScript". Samples with the same labels switch together. */
  label: string;
  code: string;
}

// The language picked in any tabbed block applies to all of them, and is remembered.
const LANGUAGE_KEY = 'mana-preview:language';
const listeners = new Set<() => void>();
let language: string | null = (() => {
  try {
    return window.localStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
})();

const setLanguage = (next: string) => {
  language = next;
  try {
    window.localStorage.setItem(LANGUAGE_KEY, next);
  } catch {
    // Storage blocked: the choice lasts for this page view.
  }
  for (const listener of listeners) listener();
};

const useLanguage = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => language,
  );

const Highlighted = ({ code }: { code: string }) => (
  <code>
    {highlight(code).map((token, index) =>
      token.kind === 'plain' ? (
        token.text
      ) : (
        <span key={index} className={styles[`tok-${token.kind}`]}>
          {token.text}
        </span>
      ),
    )}
  </code>
);

Highlighted.displayName = 'Highlighted';

const CopyButton = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);
  return (
    <Clickable
      tag="button"
      className={styles.copyButton}
      aria-label={copied ? 'Copied' : 'Copy code'}
      onClick={async () => setCopied(await copyText(code, 'Code'))}
    >
      {copied ? <CheckmarkSmallIcon size="xs" color="currentColor" /> : <CopyIcon size="xs" color="currentColor" />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </Clickable>
  );
};

CopyButton.displayName = 'CopyButton';

/** A code sample (or tabs of equivalent samples) with a copy button. */
export const CodeBlock = ({ samples, title }: { samples: CodeSample[]; title?: string }) => {
  const preferred = useLanguage();
  const current = samples.find((sample) => sample.label === preferred) ?? samples[0];
  const tabbed = samples.length > 1;
  return (
    <figure className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        {tabbed ? (
          <div className={styles.codeTabs} role="tablist" aria-label="Language">
            {samples.map((sample) => (
              <Clickable
                key={sample.label}
                tag="button"
                role="tab"
                aria-selected={sample === current}
                className={clsx(styles.codeTab, { [styles.codeTabSelected]: sample === current })}
                onClick={() => setLanguage(sample.label)}
              >
                {sample.label}
              </Clickable>
            ))}
          </div>
        ) : (
          <figcaption className={styles.codeTitle}>{title ?? current.label}</figcaption>
        )}
        <CopyButton code={current.code} />
      </div>
      <pre className={styles.code}>
        <Highlighted code={current.code} />
      </pre>
    </figure>
  );
};

CodeBlock.displayName = 'CodeBlock';

export const InlineCode = ({ children }: { children: string }) => <code className={styles.inlineCode}>{children}</code>;

InlineCode.displayName = 'InlineCode';
