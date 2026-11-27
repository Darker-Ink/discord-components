import { useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Button, InlineNotice, Popout, Switch, Text, TextInput } from '@discord-mana/components';
import { FileIcon, ImagePlusIcon, UploadIcon, WarningIcon } from '@discord-mana/icons';
import {
  MessageAttachments,
  renderAttachmentFile,
  renderAttachmentImage,
  renderAttachmentVideo,
  type APIAttachment,
  type MessageAttachmentsRenderers,
} from '@discord-mana/messages';
import { isMessageFieldAllowed, useBuilderRestrictions, useBuilderSelector, type BuilderNode } from '../core';
import { pickFiles, useAttachFiles } from './attach';
import {
  attachmentName,
  attachmentUrl,
  displayName,
  isImageFile,
  isMediaFile,
  isSpoilerName,
  readAttachments,
  reattachFile,
  removeAttachment,
  sanitizeFilename,
  renameAttachment,
  setAttachmentDescription,
  setAttachmentSpoiler,
  toPreviewAttachments,
} from './attachments';
import { patchField, readField, useEditableNode } from './fields';
import { FILE_SIZE_LIMIT, formatBytes, REQUEST_SIZE_LIMIT, useBuilderFiles, useFilesVersion } from './files';
import { PopoutPanel, RemoveButton } from './popouts';
import { useBuilderRender } from './renderContext';
import { useBuilderContext } from './useBuilderContext';
import styles from './EditableAttachments.module.css';

/** The message's attachments with their sizes, which are missing, and the total against Discord's limit. */
export const useAttachmentSummary = () => {
  const attachments = useBuilderSelector((state) => state.doc.attachments);
  const files = useBuilderFiles();
  const version = useFilesVersion();
  return useMemo(() => {
    const list = (Array.isArray(attachments) ? attachments : []).map((attachment) => {
      const name = attachment.filename ?? '';
      const stored = files.get(name);
      return {
        name,
        description: attachment.description,
        stored,
        size: stored?.size ?? 0,
        missing: stored == null,
        tooLarge: (stored?.size ?? 0) > FILE_SIZE_LIMIT,
      };
    });
    const total = list.reduce((sum, item) => sum + item.size, 0);
    return {
      list,
      total,
      missing: list.filter((item) => item.missing).map((item) => item.name),
      tooLarge: list.filter((item) => item.tooLarge).map((item) => item.name),
      overTotal: total > REQUEST_SIZE_LIMIT,
    };
    // `version` changes when files are stored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments, files, version]);
};

const FilePreview = ({ name, url, image }: { name: string; url?: string; image: boolean }) =>
  image && url != null ? (
    <img className={styles.previewImage} src={url} alt="" draggable={false} />
  ) : (
    <span className={styles.previewIcon} aria-hidden="true">
      <FileIcon size="md" color="currentColor" />
      <span className={styles.previewExtension}>{/\.([^.]{1,5})$/.exec(name)?.[1] ?? ''}</span>
    </span>
  );

/** Name, spoiler, alt text and removal of one attached file. */
export const AttachmentEditor = ({ name, onRemoved }: { name: string; onRemoved?: () => void }) => {
  const { store, actions } = useBuilderContext();
  const files = useBuilderFiles();
  useFilesVersion();
  const doc = useBuilderSelector((state) => state.doc);
  const [currentName, setCurrentName] = useState(name);
  const [draft, setDraft] = useState(displayName(name));
  const attachment = readAttachments(doc).find((item) => item.filename === currentName);
  // Removed (or renamed by an undo) while open.
  if (attachment == null) return null;
  const live = currentName;
  const stored = files.get(live);
  const commitName = () => {
    const wanted = isSpoilerName(live) ? `SPOILER_${draft}` : draft;
    if (draft.trim() === '' || wanted === live) {
      setDraft(displayName(live));
      return;
    }
    const next = renameAttachment(store, files, live, wanted);
    setCurrentName(next);
    setDraft(displayName(next));
  };
  return (
    <PopoutPanel
      title="File"
      footer={
        <RemoveButton
          label="Remove"
          onClick={() => {
            removeAttachment(actions, store.getState().doc, live);
            onRemoved?.();
          }}
        />
      }
    >
      <div className={styles.editorHead}>
        <FilePreview name={live} url={stored?.url} image={stored != null && isImageFile(live, stored)} />
        <div className={styles.editorMeta}>
          <Text variant="body-sm/semibold" color="text-strong" className={styles.ellipsis}>
            {displayName(live)}
          </Text>
          <Text
            variant="body-xs/normal"
            color={stored != null && stored.size > FILE_SIZE_LIMIT ? 'text-feedback-critical' : 'text-muted'}
          >
            {stored != null
              ? `${formatBytes(stored.size)}${stored.size > FILE_SIZE_LIMIT ? ` · over ${formatBytes(FILE_SIZE_LIMIT)}` : ''}`
              : 'Missing'}
          </Text>
        </div>
      </div>
      {stored == null ? (
        <div className={styles.missing}>
          <InlineNotice type="warning" message="This file isn’t in this browser any more." />
          <Button
            variant="secondary"
            size="sm"
            text="Choose file"
            onClick={async () => {
              const [file] = await pickFiles({ multiple: false });
              if (file != null) reattachFile(files, live, file);
            }}
          />
        </div>
      ) : null}
      <TextInput
        label="Name"
        value={draft}
        onChange={setDraft}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commitName();
        }}
        spellCheck={false}
      />
      <TextInput
        label="Alt text"
        value={attachment.description ?? ''}
        placeholder="Describe the file"
        onChange={(text) => setAttachmentDescription(actions, store.getState().doc, live, text)}
        onBlur={() => actions.checkpoint()}
      />
      <Switch
        label="Spoiler"
        checked={isSpoilerName(live)}
        onChange={(spoiler: boolean) => {
          const next = setAttachmentSpoiler(store, files, live, spoiler);
          setCurrentName(next);
          setDraft(displayName(next));
        }}
      />
    </PopoutPanel>
  );
};

AttachmentEditor.displayName = 'AttachmentEditor';

/**
 * A classic message's attachments, drawn like the client draws them (the media mosaic and file cards).
 * Clicking one opens its editor; the client's own hover buttons edit and remove.
 */
export const EditableAttachments = ({
  message,
}: {
  message?: { id?: string; channel_id?: string; flags?: number };
}) => {
  const { readOnly } = useBuilderRender();
  const { store, actions } = useBuilderContext();
  const doc = useBuilderSelector((state) => state.doc);
  const files = useBuilderFiles();
  const version = useFilesVersion();
  // `version` changes when files are stored or measured.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const attachments = useMemo(() => toPreviewAttachments(doc, files), [doc.attachments, files, version]);
  const pressedRef = useRef<Element | null>(null);
  const [editing, setEditing] = useState<{ name: string; anchor: Element | null } | null>(null);
  const anchorRef = useMemo(() => ({ current: editing?.anchor ?? null }), [editing]);
  const renderers = useMemo<Partial<MessageAttachmentsRenderers>>(() => {
    if (readOnly) return {};
    const intercept =
      <P extends { item: { originalItem: APIAttachment }; onClick?: unknown }>(render: (props: P) => ReactNode) =>
      (props: P) =>
        render({
          ...props,
          onClick: (event: { currentTarget: Element; preventDefault?: () => void }) => {
            event.preventDefault?.();
            setEditing({ name: props.item.originalItem.filename, anchor: event.currentTarget });
          },
        });
    return {
      renderImageComponent: intercept(renderAttachmentImage as never),
      renderVideoComponent: intercept(renderAttachmentVideo as never),
      renderGenericFileComponent: intercept(renderAttachmentFile as never),
      renderPlaintextFilePreview: intercept(renderAttachmentFile as never),
    };
  }, [readOnly]);
  if (attachments.length === 0) return null;
  return (
    <div
      className={styles.attachments}
      onPointerDownCapture={(event) => {
        const target = event.target as Element;
        pressedRef.current = target.closest('[class*="mosaicItem"], [class*="file"]') ?? target;
      }}
    >
      <MessageAttachments
        attachments={attachments}
        message={message}
        canDeleteAttachments={!readOnly}
        onEditAttachment={(attachment) => setEditing({ name: attachment.filename, anchor: pressedRef.current })}
        onRemoveAttachment={(attachment) => removeAttachment(actions, store.getState().doc, attachment.filename)}
        allowFullScreen={readOnly}
        {...renderers}
      />
      <Popout
        shouldShow={editing != null}
        targetElementRef={anchorRef as never}
        position="bottom"
        align="left"
        onRequestClose={() => setEditing(null)}
        renderPopout={() =>
          editing != null ? <AttachmentEditor name={editing.name} onRemoved={() => setEditing(null)} /> : null
        }
      >
        {() => null}
      </Popout>
    </div>
  );
};

EditableAttachments.displayName = 'EditableAttachments';

/**
 * Under a media URL field: the attached files to point it at (`attachment://name`), and a button to attach a new
 * one. `accept` limits what is offered (images for embed images and icons).
 */
export const AttachmentChooser = ({
  uid,
  field,
  accept = 'any',
}: {
  uid: string;
  field: string;
  accept?: 'image' | 'media' | 'any';
}) => {
  const { actions } = useBuilderContext();
  const restrictions = useBuilderRestrictions();
  const node = useEditableNode(uid);
  const summary = useAttachmentSummary();
  const attach = useAttachFiles();
  if (!isMessageFieldAllowed(restrictions, 'attachments')) return null;
  const current = attachmentName(readField(node, field));
  const offered = summary.list.filter((item) =>
    accept === 'any'
      ? true
      : accept === 'image'
        ? isImageFile(item.name, item.stored)
        : isMediaFile(item.name, item.stored),
  );
  const set = (name: string) => {
    if (node == null) return;
    actions.update(uid, patchField(node as BuilderNode, field, attachmentUrl(name)));
  };
  return (
    <div className={styles.chooser} role="group" aria-label="Attached files">
      {offered.map((item) => (
        <button
          key={item.name}
          type="button"
          className={styles.choice}
          aria-pressed={current === item.name}
          title={displayName(item.name)}
          onClick={() => set(item.name)}
        >
          <FilePreview
            name={item.name}
            url={item.stored?.url}
            image={item.stored != null && isImageFile(item.name, item.stored)}
          />
          <span className={styles.choiceName}>{displayName(item.name)}</span>
          {item.missing ? <WarningIcon size="xxs" color="currentColor" className={styles.choiceWarning} /> : null}
        </button>
      ))}
      <button
        type="button"
        className={clsx(styles.choice, styles.upload)}
        onClick={async () => {
          const picked = await pickFiles({
            multiple: false,
            accept: accept === 'image' ? 'image/*' : accept === 'media' ? 'image/*,video/*' : undefined,
          });
          const [name] = attach(picked, { show: false });
          if (name != null) set(name);
        }}
      >
        <span className={styles.previewIcon} aria-hidden="true">
          {accept === 'any' ? (
            <UploadIcon size="sm" color="currentColor" />
          ) : (
            <ImagePlusIcon size="sm" color="currentColor" />
          )}
        </span>
        <span className={styles.choiceName}>Upload</span>
      </button>
    </div>
  );
};

AttachmentChooser.displayName = 'AttachmentChooser';

/** The message's files: sizes against Discord's limits, missing ones, and attaching more. */
export const FilesSection = ({ className }: { className?: string }) => {
  const restrictions = useBuilderRestrictions();
  const summary = useAttachmentSummary();
  const attach = useAttachFiles();
  const poll = useBuilderSelector((state) => state.doc.mode === 'poll');
  const anchorRef = useRef<Element | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  if (!isMessageFieldAllowed(restrictions, 'attachments')) return null;
  // A poll goes alone: files only show here (to be removed) when it came with some.
  if (poll && summary.list.length === 0) return null;
  return (
    <section className={clsx(styles.section, className)} aria-label="Files">
      <div className={styles.sectionHead}>
        <Text variant="body-sm/semibold" color="text-strong">
          Files
        </Text>
        <Text
          variant="body-xs/normal"
          color={summary.overTotal ? 'text-feedback-critical' : 'text-muted'}
          className={styles.total}
        >
          {formatBytes(summary.total)} / {formatBytes(REQUEST_SIZE_LIMIT)}
        </Text>
      </div>
      {summary.list.length > 0 ? (
        <ul className={styles.fileList}>
          {summary.list.map((item) => (
            <li key={item.name}>
              <button
                type="button"
                className={styles.fileRow}
                data-invalid={item.missing || item.tooLarge || undefined}
                onClick={(event) => {
                  anchorRef.current = event.currentTarget;
                  setEditing(item.name);
                }}
              >
                <FilePreview
                  name={item.name}
                  url={item.stored?.url}
                  image={item.stored != null && isImageFile(item.name, item.stored)}
                />
                <span className={styles.fileText}>
                  <Text variant="body-sm/medium" color="text-default" className={styles.ellipsis}>
                    {displayName(item.name)}
                  </Text>
                  <Text
                    variant="body-xs/normal"
                    color={item.missing || item.tooLarge ? 'text-feedback-critical' : 'text-muted'}
                  >
                    {item.missing
                      ? 'Missing'
                      : `${formatBytes(item.size)}${item.tooLarge ? ` · over ${formatBytes(FILE_SIZE_LIMIT)}` : ''}${isSpoilerName(item.name) ? ' · Spoiler' : ''}`}
                  </Text>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!poll ? (
        <Button
          variant="secondary"
          size="sm"
          icon={{ type: 'icon', asset: UploadIcon }}
          text="Attach files"
          onClick={async () => attach(await pickFiles())}
        />
      ) : null}
      <Popout
        shouldShow={editing != null}
        targetElementRef={anchorRef as never}
        position="bottom"
        align="left"
        onRequestClose={() => setEditing(null)}
        renderPopout={() =>
          editing != null ? <AttachmentEditor name={editing} onRemoved={() => setEditing(null)} /> : null
        }
      >
        {() => null}
      </Popout>
    </section>
  );
};

FilesSection.displayName = 'FilesSection';

/**
 * Files aren't kept with a saved or shared message (only their names are): this asks for the missing ones
 * again. Picked files take the missing names they match, else the remaining ones in order.
 */
export const MissingFilesNotice = ({ className }: { className?: string }) => {
  const summary = useAttachmentSummary();
  const files = useBuilderFiles();
  if (summary.missing.length === 0) return null;
  const names = summary.missing;
  return (
    <div className={clsx(styles.missingNotice, className)} data-builder-ui>
      <InlineNotice
        type="warning"
        message={`${names.length === 1 ? `${displayName(names[0])} needs` : `${names.length} files need`} attaching again`}
      />
      <Button
        variant="secondary"
        size="sm"
        icon={{ type: 'icon', asset: UploadIcon }}
        text="Choose files"
        onClick={async () => {
          const picked = await pickFiles({ multiple: names.length > 1 });
          const open = [...names];
          const take = (name: string) => open.splice(open.indexOf(name), 1)[0];
          for (const file of picked) {
            const match = open.find(
              (name) => name === sanitizeFilename(file.name) || displayName(name) === sanitizeFilename(file.name),
            );
            const name = match != null ? take(match) : open.shift();
            if (name != null) reattachFile(files, name, file);
          }
        }}
      />
    </div>
  );
};

MissingFilesNotice.displayName = 'MissingFilesNotice';
