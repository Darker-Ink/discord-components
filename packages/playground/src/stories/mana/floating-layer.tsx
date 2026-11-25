import { useState, type RefObject } from 'react';
import { Button, FloatingLayer, Text, type FloatingLayerPlacement } from '@discord-components/components';
import type { StoryGroup } from '../../types';
import styles from './floating-layer.module.css';

interface FloatingLayerStoryProps {
  placement: FloatingLayerPlacement;
  spacing: number;
  autoFlip: boolean;
  autoShift: boolean;
  strategy: 'fixed' | 'absolute';
  portal: boolean;
  blockPointerEvents: boolean;
}

const FloatingLayerStory = ({
  placement,
  spacing,
  autoFlip,
  autoShift,
  strategy,
  portal,
  blockPointerEvents,
}: FloatingLayerStoryProps) => {
  const [open, setOpen] = useState(false);
  return (
    <FloatingLayer
      open={open}
      onOpenChange={setOpen}
      placement={placement}
      spacing={spacing}
      autoFlip={autoFlip}
      autoShift={autoShift}
      strategy={strategy}
      portal={portal}
      blockPointerEvents={blockPointerEvents}
      renderLayer={() => (
        <div className={styles.layer}>
          <Text variant="body-sm/medium">FloatingLayer Content</Text>
        </div>
      )}
    >
      {({ ref, props }) => (
        <Button
          variant="primary"
          text="Target Element"
          onClick={() => setOpen(!open)}
          {...props}
          // FloatingLayer hands out a callback ref; Button's type only declares ref objects.
          buttonRef={ref as unknown as RefObject<HTMLButtonElement | null>}
        />
      )}
    </FloatingLayer>
  );
};

FloatingLayerStory.displayName = 'FloatingLayerStory';

const floatingLayer: StoryGroup = {
  title: 'FloatingLayer',
  stories: [
    {
      name: 'FloatingLayer',
      id: 'popover-layer',
      component: FloatingLayerStory,
      controls: {
        placement: {
          label: 'Placement',
          type: 'select',
          defaultValue: 'bottom',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Top Start', value: 'top-start' },
            { label: 'Top End', value: 'top-end' },
            { label: 'Bottom', value: 'bottom' },
            { label: 'Bottom Start', value: 'bottom-start' },
            { label: 'Bottom End', value: 'bottom-end' },
            { label: 'Left', value: 'left' },
            { label: 'Left Start', value: 'left-start' },
            { label: 'Left End', value: 'left-end' },
            { label: 'Right', value: 'right' },
            { label: 'Right Start', value: 'right-start' },
            { label: 'Right End', value: 'right-end' },
          ],
        },
        spacing: { label: 'Spacing (px)', type: 'number', defaultValue: 8 },
        autoFlip: { label: 'Auto Flip', type: 'boolean', defaultValue: true },
        autoShift: { label: 'Auto Shift', type: 'boolean', defaultValue: true },
        strategy: {
          label: 'Strategy',
          type: 'select',
          defaultValue: 'fixed',
          options: [
            { label: 'Fixed', value: 'fixed' },
            { label: 'Absolute', value: 'absolute' },
          ],
        },
        portal: { label: 'Portal', type: 'boolean', defaultValue: true },
        blockPointerEvents: { label: 'Block Pointer Events', type: 'boolean', defaultValue: false },
      },
    },
  ],
};

export default floatingLayer;
