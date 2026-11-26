import clsx from 'clsx';
import type { PreviewTheme } from '../../shared/api';
import { Logo } from './Logo';
import { ThemeSwitcher } from './ThemeSwitcher';
import styles from './Site.module.css';

export const SiteHeader = ({
  page,
  theme,
  onThemeChange,
}: {
  page: 'home' | 'docs' | 'other';
  theme: PreviewTheme;
  onThemeChange: (theme: PreviewTheme) => void;
}) => (
  <header className={clsx(styles.header, { [styles.headerDocs]: page === 'docs' })}>
    <div className={styles.headerInner}>
      <Logo />
      <nav className={styles.nav} aria-label="Site">
        <a href="/docs" className={styles.navLink} aria-current={page === 'docs' ? 'page' : undefined}>
          Docs
        </a>
        <a href="/#key" className={clsx(styles.navLink, styles.navLinkWide)}>
          Get a key
        </a>
      </nav>
      <ThemeSwitcher value={theme} onChange={onThemeChange} />
    </div>
  </header>
);

SiteHeader.displayName = 'SiteHeader';
