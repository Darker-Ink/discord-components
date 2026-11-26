import { Tooltip } from '@discord-mana/components';
import { CircleErrorIcon, WarningIcon } from '@discord-mana/icons';
import type { ValidationIssue } from '../core';
import styles from './IssueBadge.module.css';

/** A node's own problems (not a text field's): a small marker in its corner, with the messages on hover. */
export const IssueBadge = ({ issues }: { issues: readonly ValidationIssue[] }) => {
  if (issues.length === 0) return null;
  const error = issues.some((issue) => issue.severity === 'error');
  const text = issues.map((issue) => issue.message).join('\n');
  const Icon = error ? CircleErrorIcon : WarningIcon;
  return (
    <Tooltip text={text} position="top">
      <span
        data-builder-ui
        data-builder-nodrag
        className={styles.badge}
        data-severity={error ? 'error' : 'warning'}
        role="img"
        aria-label={text}
      >
        <Icon size="xxs" color="currentColor" />
      </span>
    </Tooltip>
  );
};

IssueBadge.displayName = 'IssueBadge';
