import { useCallback } from 'react';
import clsx from 'clsx';
import { Text } from '@discord-mana/components';
import { CircleCheckIcon, CircleErrorIcon, WarningIcon } from '@discord-mana/icons';
import {
  findNode,
  ROOT_UID,
  useBuilderIssues,
  useDocumentStats,
  useBuilderSelector,
  type BuilderDocument,
  type ValidationIssue,
} from '../core';
import { describeNode } from './describe';
import { KIND_ICONS } from './meta';
import { focusNode } from './NodeFrame';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUIStore } from './uiStore';
import styles from './ValidationPanel.module.css';

const FIELD_LABELS: Record<string, string> = {
  content: 'content',
  title: 'title',
  description: 'description',
  name: 'name',
  value: 'value',
  label: 'label',
  url: 'link',
  'author.name': 'author',
  'author.url': 'author link',
  'author.icon_url': 'author icon',
  'footer.text': 'footer',
  'footer.icon_url': 'footer icon',
  'image.url': 'image',
  'thumbnail.url': 'thumbnail',
  'media.url': 'media',
  'file.url': 'file',
  custom_id: 'custom ID',
  placeholder: 'placeholder',
  username: 'username',
  avatar_url: 'avatar',
  color: 'colour',
  accent_color: 'accent colour',
  timestamp: 'timestamp',
};

const whereIs = (doc: BuilderDocument, issue: ValidationIssue) => {
  const uid = issue.nodeId ?? ROOT_UID;
  const node = uid === ROOT_UID ? 'Message' : describeNode(doc, uid);
  const field = issue.field != null ? (FIELD_LABELS[issue.field] ?? issue.field) : null;
  return field != null ? `${node} · ${field}` : node;
};

/** Takes the editor to an issue: selects its node, scrolls to it and focuses the text at fault. */
export const useRevealIssue = () => {
  const ui = useBuilderUIStore();
  const { store } = useBuilderContext();
  return useCallback(
    (issue: ValidationIssue) => {
      const uid = issue.nodeId ?? ROOT_UID;
      if (uid === ROOT_UID) {
        if (issue.field === 'content') ui.set({ pendingFocus: { uid: ROOT_UID, field: 'content' } });
        ui.set({ selectedId: null });
        return;
      }
      if (findNode(store.getState().doc, uid) == null) return;
      focusNode(ui, uid);
      requestAnimationFrame(() => ui.frames.get(uid)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      if (issue.field != null) ui.set({ pendingFocus: { uid, field: issue.field } });
    },
    [store, ui],
  );
};

const Meter = ({ label, value, limit }: { label: string; value: number; limit: number }) => {
  const ratio = Math.min(1, value / limit);
  const state = value > limit ? 'over' : ratio >= 0.9 ? 'near' : 'ok';
  return (
    <div className={styles.meter} data-state={state}>
      <div className={styles.meterText}>
        <span>{label}</span>
        <span className={styles.meterValue}>
          {value.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className={styles.meterTrack} aria-hidden>
        <div className={styles.meterFill} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
};

export interface ValidationPanelProps {
  className?: string;
  /** Called after an issue is revealed in the editor (e.g. to close a drawer on small screens). */
  onReveal?: (issue: ValidationIssue) => void;
}

/**
 * Everything Discord would reject (errors) or might (warnings), checked against its documented limits as you
 * type. Click a problem to go to it. Totals that have limits (characters, components) are shown as meters.
 */
export const ValidationPanel = ({ className, onReveal }: ValidationPanelProps) => {
  const issues = useBuilderIssues();
  const stats = useDocumentStats();
  const mode = useBuilderSelector((state) => state.doc.mode);
  const { store } = useBuilderContext();
  const reveal = useRevealIssue();
  const doc = store.getState().doc;
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  return (
    <div className={clsx(styles.panel, className)}>
      <div className={styles.meters}>
        {mode === 'classic' ? (
          <>
            <Meter label="Content" value={stats.contentLength} limit={stats.contentLimit} />
            <Meter label="Embed text" value={stats.embedCharacters} limit={stats.embedCharacterLimit} />
          </>
        ) : (
          <>
            <Meter label="Components" value={stats.componentCount} limit={stats.componentLimit} />
            <Meter label="Text" value={stats.textDisplayCharacters} limit={stats.textDisplayLimit} />
          </>
        )}
      </div>
      {issues.length === 0 ? (
        <div className={styles.clear} role="status">
          <CircleCheckIcon size="md" color="currentColor" />
          <div>
            <Text variant="body-md/semibold" color="text-strong">
              Ready to send
            </Text>
            <Text variant="body-sm/normal" color="text-muted">
              Nothing here breaks Discord’s rules for messages.
            </Text>
          </div>
        </div>
      ) : (
        <ul className={styles.list} aria-label={`${errors.length} errors, ${warnings.length} warnings`}>
          {[...errors, ...warnings].map((issue, index) => {
            const location = issue.nodeId != null && issue.nodeId !== ROOT_UID ? findNode(doc, issue.nodeId) : null;
            const KindIcon = location != null ? KIND_ICONS[location.kind] : null;
            const SeverityIcon = issue.severity === 'error' ? CircleErrorIcon : WarningIcon;
            return (
              <li key={`${issue.code}-${issue.path.join('.')}-${index}`}>
                <button
                  type="button"
                  className={styles.issue}
                  data-severity={issue.severity}
                  onClick={() => {
                    reveal(issue);
                    onReveal?.(issue);
                  }}
                >
                  <span className={styles.severity}>
                    <SeverityIcon size="xs" color="currentColor" />
                  </span>
                  <span className={styles.issueText}>
                    <span className={styles.message}>{issue.message}</span>
                    <span className={styles.where}>
                      {KindIcon != null ? <KindIcon size="xxs" color="currentColor" /> : null}
                      {whereIs(doc, issue)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

ValidationPanel.displayName = 'ValidationPanel';
