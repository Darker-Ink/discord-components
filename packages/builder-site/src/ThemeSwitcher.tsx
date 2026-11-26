import clsx from 'clsx';
import { Clickable, Tooltip } from '@discord-mana/components';
import { themeClassName } from '@discord-mana/tokens';
import { THEMES, type SiteTheme } from './theme';
import styles from './App.module.css';

/** Discord's four themes as swatches; each swatch wears its own theme's tokens. */
export const ThemeSwitcher = ({ value, onChange }: { value: SiteTheme; onChange: (theme: SiteTheme) => void }) => (
  <div className={styles.themeSwitcher} role="radiogroup" aria-label="Theme">
    {THEMES.map(({ id, label, theme }) => (
      <Tooltip key={id} text={label} position="bottom">
        <Clickable
          role="radio"
          aria-checked={value === id}
          aria-label={label}
          className={clsx(styles.swatch, themeClassName(theme), { [styles.swatchSelected]: value === id })}
          onClick={() => onChange(id)}
        />
      </Tooltip>
    ))}
  </div>
);

ThemeSwitcher.displayName = 'ThemeSwitcher';
