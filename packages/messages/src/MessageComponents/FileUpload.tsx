import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import clsx from 'clsx';
import { Anchor, Clickable, Text, Tooltip, tokens, useManaContext } from '@discord-mana/components';
import { CircleCheckIcon, FileUpIcon, TrashIcon } from '@discord-mana/icons';
import { FileIcon } from '../attachments/FileAttachment';
import { useMessageI18n } from '../Message/messageI18n';
import { useComponentContext, useComponentState } from './ComponentState';
import { ComponentType, type FileUploadComponent } from './types';
import styles from './FileUpload.module.css';

/** The smallest upload limit the client uses (servers can raise it with boosts). */
export const DEFAULT_MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

const IMAGE_EXTENSIONS = ['png', 'gif', 'jpg', 'jpeg', 'jfif', 'webp', 'avif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'qt', 'webm'];
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'ogg', 'opus', 'flac'];

/** `file_types` takes ".ext" entries and the "image", "video" and "audio" groups (the client's `useFileTypes`). */
const getAllowedExtensions = (fileTypes: string[] | undefined): string[] => {
  if (fileTypes == null || fileTypes.length === 0) return [];
  const extensions = fileTypes.filter((type) => type.startsWith('.')).map((type) => type.slice(1));
  if (fileTypes.includes('image')) extensions.push(...IMAGE_EXTENSIONS);
  if (fileTypes.includes('video')) extensions.push(...VIDEO_EXTENSIONS);
  if (fileTypes.includes('audio')) extensions.push(...AUDIO_EXTENSIONS);
  return extensions;
};

const formatTypes = (fileTypes: string[] | undefined, i18n: ReturnType<typeof useMessageI18n>, locale: string) => {
  if (fileTypes == null || fileTypes.length === 0) return null;
  const parts: string[] = [];
  if (fileTypes.includes('image')) parts.push(i18n.FILE_TYPE_IMAGE);
  if (fileTypes.includes('video')) parts.push(i18n.FILE_TYPE_VIDEO);
  if (fileTypes.includes('audio')) parts.push(i18n.FILE_TYPE_AUDIO);
  parts.push(...fileTypes.filter((type) => type.startsWith('.')).sort());
  return parts.length === 0 ? null : new Intl.ListFormat(locale, { type: 'disjunction' }).format(parts);
};

/** "20 MB" (binary megabytes, like the client's upload limits). */
const formatUploadSize = (bytes: number) => `${+(bytes / 1024 / 1024).toFixed(2)} MB`;

const DropArea = ({
  dropping,
  onBrowse,
  minValues,
  maxValues,
  types,
  maxSize,
}: {
  dropping: boolean;
  onBrowse: () => void;
  minValues: number;
  maxValues: number;
  types: string | null;
  maxSize: string;
}) => {
  const i18n = useMessageI18n();
  const drop = i18n.FILE_UPLOAD_DROP(maxValues);
  return (
    <div className={styles.mainWrapper}>
      <div className={clsx(styles.mainBody, { [styles.hidden]: dropping })}>
        <FileUpIcon color={tokens.colors.ICON_STRONG} size="refresh_sm" />
        <Text variant="body-md/normal" color="text-muted">
          {drop.before}
          <Anchor onClick={onBrowse}>{drop.link}</Anchor>
        </Text>
        <Text variant="body-xs/normal" color="text-muted">
          {i18n.FILE_UPLOAD_HINT(minValues, maxValues, types, maxSize)}
        </Text>
      </div>
      {dropping && (
        <div className={clsx(styles.mainBody, styles.absolutelyPositioned)}>
          <FileUpIcon color={tokens.colors.ICON_STRONG} size="refresh_sm" />
          <Text variant="body-md/normal" color="text-strong">
            {i18n.FILE_UPLOAD_DROP_HERE}
          </Text>
        </div>
      )}
    </div>
  );
};

DropArea.displayName = 'DropArea';

const LimitReached = () => {
  const i18n = useMessageI18n();
  return (
    <div className={clsx(styles.mainWrapper, styles.mainBody)}>
      <CircleCheckIcon color={tokens.colors.ICON_STRONG} size="refresh_sm" />
      <Text variant="body-md/normal" color="text-strong">
        {i18n.FILE_UPLOAD_LIMIT_REACHED}
      </Text>
      <Text variant="body-xs/normal" color="text-muted">
        {i18n.FILE_UPLOAD_REMOVE_SOME}
      </Text>
    </div>
  );
};

LimitReached.displayName = 'LimitReached';

const UploadRow = ({
  file,
  onRemove,
  singleFileInput = false,
}: {
  file: File;
  onRemove: () => void;
  singleFileInput?: boolean;
}) => {
  const i18n = useMessageI18n();
  return (
    <div className={clsx(styles.file, { [styles.singleFileInput]: singleFileInput })}>
      <FileIcon filename={file.name} />
      <Text variant={singleFileInput ? 'body-md/medium' : 'body-xs/medium'} className={styles.filename}>
        {file.name ?? i18n.FILE_UPLOAD_UNKNOWN_FILE}
      </Text>
      <div className={styles.miniPopover}>
        <Tooltip text={i18n.FILE_UPLOAD_REMOVE}>
          <Clickable
            className={styles.action}
            aria-label={i18n.FILE_UPLOAD_REMOVE}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <TrashIcon size="xs" color="currentColor" className={styles.actionIcon} />
          </Clickable>
        </Tooltip>
      </div>
    </div>
  );
};

UploadRow.displayName = 'UploadRow';

const matchesTypes = (file: File, extensions: string[]) =>
  extensions.length === 0 || extensions.some((extension) => file.name.toLowerCase().endsWith(`.${extension}`));

/**
 * A modal file upload: a drop zone with a browse link, the picked files, and a limit notice. Files stay in the
 * browser; the submit payload carries their indexes into the modal's `attachments`, like the client's.
 */
export const FileUpload = (component: FileUploadComponent) => {
  const { minValues = 1, maxValues = 1, fileTypes } = component;
  const i18n = useMessageI18n();
  const context = useComponentContext();
  if (context?.modal == null) throw new Error('FileUploadActionComponent requires modalCustomId from context');
  const { state, executeStateUpdate, error } = useComponentState(component);
  const { locale } = useManaContext();
  const extensions = useMemo(() => getAllowedExtensions(fileTypes), [fileTypes]);
  const types = useMemo(() => formatTypes(fileTypes, i18n, locale), [fileTypes, i18n, locale]);
  const uploadIds = useMemo(() => (state?.type === ComponentType.FileUpload ? state.uploadIds : []), [state]);
  const files = uploadIds.map((id) => context.uploads[id]).filter((file) => file != null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dropping, setDropping] = useState(false);
  const setUploadIds = useCallback(
    (ids: string[]) => executeStateUpdate({ type: ComponentType.FileUpload, uploadIds: ids }),
    [executeStateUpdate],
  );
  const addFiles = useCallback(
    (picked: File[]) => {
      if (picked.length === 0) return;
      if (uploadIds.length + picked.length > maxValues) {
        context.onUploadError?.(i18n.FILE_UPLOAD_TOO_MANY, i18n.FILE_UPLOAD_MAX(maxValues));
        return;
      }
      if (!picked.every((file) => matchesTypes(file, extensions))) {
        context.onUploadError?.(i18n.INVALID_FILE_TYPE, i18n.FILE_MUST_BE(types ?? ''));
        return;
      }
      setUploadIds(uploadIds.concat(context.addUploads(picked)));
    },
    [uploadIds, maxValues, extensions, types, context, i18n, setUploadIds],
  );
  const remove = (id: string) => {
    context.removeUpload(id);
    setUploadIds(uploadIds.filter((value) => value !== id));
  };
  useEffect(() => {
    const node = dropRef.current;
    if (node == null) return;
    const over = (event: Event) => {
      event.preventDefault();
      if ((event as unknown as DragEvent).dataTransfer?.types.includes('Files')) setDropping(true);
    };
    const leave = (event: Event) => {
      if (!node.contains((event as MouseEvent).relatedTarget as Node | null)) setDropping(false);
    };
    const drop = (event: Event) => {
      event.preventDefault();
      setDropping(false);
      addFiles(Array.from((event as unknown as DragEvent).dataTransfer?.files ?? []));
    };
    node.addEventListener('dragover', over);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', drop);
    return () => {
      node.removeEventListener('dragover', over);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', drop);
    };
  }, [addFiles]);
  if (maxValues === 1 && files.length === 1)
    return <UploadRow file={files[0]} onRemove={() => remove(uploadIds[0])} singleFileInput />;
  return (
    <div
      ref={dropRef}
      className={clsx(styles.container, { [styles.dropping]: dropping, [styles.error]: error != null })}
    >
      {uploadIds.length >= maxValues ? (
        <LimitReached />
      ) : (
        <DropArea
          dropping={dropping}
          onBrowse={() => inputRef.current?.click()}
          minValues={minValues}
          maxValues={maxValues}
          types={types}
          maxSize={formatUploadSize(Math.max(DEFAULT_MAX_UPLOAD_SIZE, context.maxUploadSize ?? 0))}
        />
      )}
      {files.length > 0 && (
        <div className={styles.files}>
          {files.map((file, index) => (
            <UploadRow key={uploadIds[index]} file={file} onRemove={() => remove(uploadIds[index])} />
          ))}
        </div>
      )}
      {/* The client's FileInput: an invisible input over the drop zone. */}
      <input
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          fontSize: 0,
        }}
        className={styles.fileInput}
        type="file"
        tabIndex={-1}
        onMouseDown={(event) => {
          event.currentTarget.value = '';
        }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          addFiles(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = '';
        }}
        multiple={maxValues > 1}
        accept={extensions.map((extension) => `.${extension}`).join(',')}
        ref={inputRef}
      />
    </div>
  );
};

FileUpload.displayName = 'FileUpload';
