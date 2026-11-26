import { useContext, useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import { AccessibilityPreferencesContext, Button, RiveAnimations, Stack, Switch, Text } from '@discord-mana/components';
import type { StoryGroup } from '../../types';
import styles from './rive-animations.module.css';

const ANIMATIONS = Object.entries(RiveAnimations)
  .filter(([, Component]) => typeof Component === 'function' && 'riveSrc' in Component)
  .map(([name, Component]) => ({ name, Component: Component as ComponentType<{ style?: CSSProperties }> }))
  .sort((a, b) => a.name.localeCompare(b.name));

const AllAnimationsStory = () => {
  const [forceReducedMotion, setForceReducedMotion] = useState(true);
  const preferences = useContext(AccessibilityPreferencesContext);
  const [resetKey, setResetKey] = useState(0);
  const value = useMemo(
    () => ({ ...preferences, reducedMotion: { ...preferences.reducedMotion, enabled: forceReducedMotion } }),
    [preferences, forceReducedMotion],
  );
  return (
    <AccessibilityPreferencesContext.Provider value={value}>
      <div className={styles.switchWrapper}>
        <Stack gap={8}>
          <Switch
            onChange={() => setForceReducedMotion((enabled) => !enabled)}
            label="Force reduced motion"
            checked={forceReducedMotion}
          />
          <Button onClick={() => setResetKey((key) => key + 1)} text="Reset animations" />
        </Stack>
      </div>
      <div key={resetKey} className={styles.grid}>
        {ANIMATIONS.map(({ name, Component }) => (
          <div key={name} className={styles.cell}>
            <div className={styles.animationWrapper}>
              <Component style={{ width: '100%', height: '100%' }} />
            </div>
            <Text variant="body-xs/normal" color="text-subtle" className={styles.label}>
              {name}
            </Text>
          </div>
        ))}
      </div>
    </AccessibilityPreferencesContext.Provider>
  );
};

AllAnimationsStory.displayName = 'AllAnimationsStory';

const riveAnimations: StoryGroup = {
  title: 'Rive Animations',
  stories: [{ name: 'All Animations', id: 'rive-all-animations', component: AllAnimationsStory }],
};

export default riveAnimations;
