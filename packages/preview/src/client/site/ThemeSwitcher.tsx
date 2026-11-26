import clsx from 'clsx';
import { Clickable, Tooltip } from '@discord-mana/components';
import { themeClassName } from '@discord-mana/tokens';
import { THEMES, type PreviewTheme } from '../../shared/api';
import { THEME_CLASSES } from '../viewParams';
import styles from './Site.module.css';

export const THEME_LABELS: Record<PreviewTheme, string> = { light: 'Light', ash: 'Ash', dark: 'Dark', onyx: 'Onyx' };

/** Discord's four themes as swatches; each swatch wears its own theme's tokens. */
export const ThemeSwitcher = ({
  value,
  onChange,
}: {
  value: PreviewTheme;
  onChange: (theme: PreviewTheme) => void;
}) => (
  <div className={styles.themeSwitcher} role="radiogroup" aria-label="Theme">
    {THEMES.map((theme) => (
      <Tooltip key={theme} text={THEME_LABELS[theme]} position="bottom">
        <Clickable
          role="radio"
          aria-checked={value === theme}
          aria-label={THEME_LABELS[theme]}
          className={clsx(styles.swatch, themeClassName(THEME_CLASSES[theme]), {
            [styles.swatchSelected]: value === theme,
          })}
          onClick={() => onChange(theme)}
        />
      </Tooltip>
    ))}
  </div>
);

ThemeSwitcher.displayName = 'ThemeSwitcher';
