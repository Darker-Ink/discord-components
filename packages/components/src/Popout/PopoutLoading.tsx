import { useRef } from 'react';
import { DialogAnnouncerTarget, useFocusLock } from '../Dialog';
import { FocusRingScope } from '../FocusRing';
import { HeadingLevel } from '../HeadingLevel';
import { Spinner, SpinnerTypes } from '../Spinner';
import styles from './Popout.module.css';

// Shown in place of a popout while its `preload` takes longer than 250ms.
export const PopoutLoading = () => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusLock(ref);
  return (
    <div className={styles.loadingPopout} ref={ref} role="dialog" tabIndex={-1} aria-modal>
      <DialogAnnouncerTarget />
      <HeadingLevel forceLevel={1}>
        <FocusRingScope containerRef={ref}>
          <Spinner type={SpinnerTypes.SPINNING_CIRCLE} />
        </FocusRingScope>
      </HeadingLevel>
    </div>
  );
};

PopoutLoading.displayName = 'PopoutLoading';
