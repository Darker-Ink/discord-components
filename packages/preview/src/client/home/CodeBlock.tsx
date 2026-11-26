import { IconButton, Tooltip } from '@discord-mana/components';
import { CopyIcon } from '@discord-mana/icons';
import { copyText } from './clipboard';
import styles from './Home.module.css';

export const CodeBlock = ({ code, label }: { code: string; label?: string }) => (
  <div className={styles.codeBlock}>
    {label != null ? <div className={styles.codeLabel}>{label}</div> : null}
    <pre className={styles.code}>
      <code>{code}</code>
    </pre>
    <div className={styles.codeCopy}>
      <Tooltip text="Copy" position="left">
        <IconButton
          variant="secondary"
          size="sm"
          icon={CopyIcon}
          aria-label="Copy code"
          onClick={() => void copyText(code, 'Code')}
        />
      </Tooltip>
    </div>
  </div>
);

CodeBlock.displayName = 'CodeBlock';

export const InlineCode = ({ children }: { children: string }) => <code className={styles.inlineCode}>{children}</code>;

InlineCode.displayName = 'InlineCode';
