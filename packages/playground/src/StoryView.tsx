import { useLayoutEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ControlsPanel } from './ControlsPanel';
import { ControlsLayout, playgroundStore, type ControlsLayoutType } from './playgroundStore';
import styles from './Playground.module.css';
import { getInitialProps } from './storyProps';
import type { Story } from './types';

type Props = Record<string, unknown>;

const useNoDefaultOverrides = () => null;

interface StoryViewProps {
  story: Story;
  controlsLayout: ControlsLayoutType;
}

// The story on its canvas, with its controls on the right, at the bottom or hidden.
export const StoryView = ({ story, controlsLayout }: StoryViewProps) => {
  const controlOverrides = playgroundStore.useField('controlOverrides');
  const useDefaultOverrides = story.useDefaultOverrides ?? useNoDefaultOverrides;
  const defaults = useDefaultOverrides();
  const defaultsKey = useMemo(() => JSON.stringify(defaults), [defaults]);
  const key = `${story.id}:${defaultsKey}`;
  const [propsKey, setPropsKey] = useState(key);
  const [props, setProps] = useState<Props>(() => getInitialProps(story, controlOverrides, defaults));
  // Start over from the defaults when they change.
  if (propsKey !== key) {
    setPropsKey(key);
    setProps(getInitialProps(story, controlOverrides, defaults));
  }
  useLayoutEffect(() => {
    playgroundStore.setState({ currentProps: props, currentDefaults: defaults, controlOverrides: null });
    // Only when the story or its defaults change; later prop changes are published as they happen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const Component = story.component;
  const showControls =
    controlsLayout !== ControlsLayout.HIDDEN && (story.controls != null || story.ControlsExtension != null);

  return (
    <div
      className={clsx(styles.main, {
        [styles.mainBottomLayout]: controlsLayout === ControlsLayout.BOTTOM,
        [styles.mainRightLayout]: controlsLayout === ControlsLayout.RIGHT,
      })}
    >
      <div className={styles.canvas}>
        <div className={styles.storyContent}>
          <Component key={story.id} {...props} />
        </div>
      </div>
      {showControls && (
        <div
          className={clsx(styles.controls, {
            [styles.controlsBottom]: controlsLayout === ControlsLayout.BOTTOM,
            [styles.controlsRight]: controlsLayout === ControlsLayout.RIGHT,
          })}
        >
          {story.ControlsExtension != null && <story.ControlsExtension />}
          {story.controls != null && (
            <ControlsPanel
              controls={story.controls}
              props={props}
              onPropsChange={(next) => {
                setProps(next);
                playgroundStore.setState({ currentProps: next });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

StoryView.displayName = 'StoryView';
