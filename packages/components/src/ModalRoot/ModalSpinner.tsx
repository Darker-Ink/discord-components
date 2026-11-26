import { Spinner } from '../Spinner';
import type { ModalRenderProps } from '../ModalStack/modalStore';
import { ModalRoot, ModalSize } from './ModalRoot';
import styles from './ModalRoot.module.css';

// What `openModalLazy` shows while the modal is still loading. The label is the client's English
// "Loading" string.
export const renderModalSpinner = ({ transitionState }: ModalRenderProps) => (
  <ModalRoot
    transitionState={transitionState}
    aria-label="Loading"
    size={ModalSize.SMALL}
    parentComponent="renderModalSpinner"
  >
    <div className={styles.spinnerContainer}>
      <Spinner />
    </div>
  </ModalRoot>
);
