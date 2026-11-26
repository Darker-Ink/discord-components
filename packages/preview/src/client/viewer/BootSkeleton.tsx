import { SKELETON_HTML } from '../../shared/skeleton';

/** The same skeleton the Worker puts in the page, so nothing changes until the messages are ready. */
export const BootSkeleton = () => <div dangerouslySetInnerHTML={{ __html: SKELETON_HTML }} />;

BootSkeleton.displayName = 'BootSkeleton';
