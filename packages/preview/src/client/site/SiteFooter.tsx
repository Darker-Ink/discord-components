import { HOME_URL, PLAYGROUND_URL } from '../../shared/links';
import styles from './Site.module.css';

export const SiteFooter = () => (
  <footer className={styles.footer}>
    <span>Not affiliated with Discord. Previews show whatever their creators send.</span>
    <nav className={styles.footerLinks} aria-label="More from discord-mana">
      <a href={HOME_URL}>discord-mana</a>
      <a href={PLAYGROUND_URL}>Playground</a>
    </nav>
  </footer>
);

SiteFooter.displayName = 'SiteFooter';
