import { createPortal } from 'react-dom';
import { useBuilderUI } from '../uiStore';
import styles from './Dnd.module.css';

/** The line (or box, for an empty list) showing where the dragged node will land. */
export const DropIndicator = () => {
  const shape = useBuilderUI((state) => (state.drag != null ? state.dropShape : null));
  if (shape == null || typeof document === 'undefined') return null;
  const style =
    shape.type === 'box'
      ? { left: shape.rect.left, top: shape.rect.top, width: shape.rect.width, height: shape.rect.height }
      : shape.x1 === shape.x2
        ? { left: shape.x1 - 1, top: shape.y1, width: 2, height: Math.max(shape.y2 - shape.y1, 16) }
        : { left: shape.x1, top: shape.y1 - 1, width: shape.x2 - shape.x1, height: 2 };
  return createPortal(
    <div
      aria-hidden
      className={shape.type === 'box' ? styles.dropBox : styles.dropLine}
      data-orientation={shape.type === 'line' && shape.x1 === shape.x2 ? 'vertical' : 'horizontal'}
      style={style}
    />,
    document.body,
  );
};

DropIndicator.displayName = 'DropIndicator';
