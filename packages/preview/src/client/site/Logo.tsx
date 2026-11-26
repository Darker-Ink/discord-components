import styles from './Site.module.css';

/** A message bubble with an arrow out of its corner: a message, shared. Also the favicon. */
const LogoMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden>
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5H7a4 4 0 0 0-4 4v5a4 4 0 0 0 4 4h1v3l4-3h3a4 4 0 0 0 4-4v-2" />
      <path d="M15 3h6v6M21 3l-7.5 7.5" />
    </g>
  </svg>
);

LogoMark.displayName = 'LogoMark';

export const Logo = () => (
  <a href="/" className={styles.logo} aria-label="mana preview, home">
    <LogoMark className={styles.logoMark} />
    <span className={styles.wordmark}>
      mana <span className={styles.wordmarkMuted}>preview</span>
    </span>
  </a>
);

Logo.displayName = 'Logo';
