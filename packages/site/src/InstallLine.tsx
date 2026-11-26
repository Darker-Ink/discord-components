import { IconButton, Tooltip, showToast } from '@discord-mana/components';
import { CopyIcon } from '@discord-mana/icons';
import styles from './Site.module.css';

const COMMAND = 'npm i discord-mana';

const copy = async () => {
  try {
    await navigator.clipboard.writeText(COMMAND);
    showToast({ text: 'Copied to clipboard', variant: 'success', toastKey: 'copy' });
  } catch {
    showToast({
      text: "Couldn't copy. Select the command and copy it yourself.",
      variant: 'critical',
      toastKey: 'copy',
    });
  }
};

export const InstallLine = () => (
  <div className={styles.install}>
    <code className={styles.installCommand}>{COMMAND}</code>
    <Tooltip text="Copy" position="top">
      <IconButton variant="icon-only" size="sm" icon={CopyIcon} aria-label="Copy the install command" onClick={copy} />
    </Tooltip>
  </div>
);

InstallLine.displayName = 'InstallLine';
