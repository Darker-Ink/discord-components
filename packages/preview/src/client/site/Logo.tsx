import styles from './Site.module.css';

/** A message bubble inside a viewfinder frame: a message, previewed. Also the favicon (on a blurple tile). */
export const LogoMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 8V6a3 3 0 0 1 3-3h2M16 3h2a3 3 0 0 1 3 3v2M21 16v2a3 3 0 0 1-3 3h-2M8 21H6a3 3 0 0 1-3-3v-2"
    />
    <path
      fill="currentColor"
      d="M9.5 7.5h5a2.5 2.5 0 0 1 2.5 2.5v2.5a2.5 2.5 0 0 1-2.5 2.5h-3.1l-2.3 1.9c-.5.4-1.1 0-1.1-.6V14.6A2.5 2.5 0 0 1 7 12.5V10a2.5 2.5 0 0 1 2.5-2.5z"
    />
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
