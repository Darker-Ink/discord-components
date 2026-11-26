import type { MouseEvent, ReactNode } from 'react';
import clsx from 'clsx';
import { Anchor, Text } from '@discord-components/components';
import { useMediaContext } from '../media/MediaContext';
import { formatFileSize, getFileType } from '../media/utils/filesize';
import { FILE_ICONS } from './fileIcons';
import styles from './FileAttachment.module.css';

export const FileIcon = ({ filename }: { filename: string }) => {
  const { i18n } = useMediaContext();
  const fileType = getFileType(filename);
  return (
    <img
      className={styles.icon}
      src={FILE_ICONS[fileType] ?? FILE_ICONS.unknown}
      alt={i18n.ATTACHMENT_FILE_TYPE(fileType)}
      title={fileType}
    />
  );
};

FileIcon.displayName = 'FileIcon';

export interface FileAttachmentProps {
  className?: string;
  url: string;
  fileName: string;
  /** Size in bytes. */
  fileSize: number;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  /** Hover actions (the download button). */
  renderAdjacentContent?: () => ReactNode;
}

/** A non-media attachment: file-type icon, name linking to the file, and its size. */
export const FileAttachment = ({
  className,
  url,
  fileName,
  fileSize,
  onClick,
  onContextMenu,
  renderAdjacentContent,
}: FileAttachmentProps) => (
  <div className={clsx(styles.fileWrapper, className)}>
    <div className={styles.file}>
      <FileIcon filename={fileName} />
      <div className={styles.fileInner}>
        <div className={styles.filenameLinkWrapper}>
          <Anchor className={styles.fileNameLink} href={url} onClick={onClick} onContextMenu={onContextMenu}>
            {fileName}
          </Anchor>
        </div>
        <Text variant="body-xs/normal" color="text-muted">
          {formatFileSize(fileSize)}
        </Text>
      </div>
    </div>
    {renderAdjacentContent != null && renderAdjacentContent()}
  </div>
);

FileAttachment.displayName = 'FileAttachment';
