import { AppRoot } from '@discord-mana/components';
import { InstallLine } from './InstallLine';
import { Logo } from './Logo';
import { Specimen } from './Specimen';
import { ThemeSwitcher } from './ThemeSwitcher';
import { themeOf, useSiteTheme, type SiteTheme } from './theme';
import styles from './Site.module.css';

const LINKS = [
  { label: 'Playground', href: 'https://play.discord-mana.dev', host: 'play.discord-mana.dev' },
  { label: 'Preview API', href: 'https://preview.discord-mana.dev', host: 'preview.discord-mana.dev' },
  {
    label: 'GitHub',
    href: 'https://github.com/Darker-Ink/discord-components',
    host: 'Darker-Ink/discord-components',
  },
];

const PACKAGES = [
  ['discord-mana', 'Everything below, in one install.'],
  ['@discord-mana/tokens', 'Colors, spacing, fonts and the four themes.'],
  ['@discord-mana/icons', 'Every icon in the client, under the names Discord uses.'],
  ['@discord-mana/components', 'The Mana design system, plus the older Void components.'],
  ['@discord-mana/messages', 'Messages, embeds, attachments, buttons and Components v2.'],
  ['@discord-mana/markdown', 'Discord’s markdown parser, with mentions, emoji and code blocks.'],
  ['@discord-mana/slate', 'The chat input, with live markdown, mentions and emoji.'],
] as const;

const Home = ({ theme, setTheme }: { theme: SiteTheme; setTheme: (theme: SiteTheme) => void }) => (
  <main className={styles.main}>
    <section className={styles.intro}>
      <h1 className={styles.headline}>Discord’s interface, in React.</h1>
      <p className={styles.lede}>
        Components recreated from Discord’s own web build and pixel‑matched to the real client in all four themes.
      </p>
      <InstallLine />
      <ul className={styles.links}>
        {LINKS.map(({ label, href, host }) => (
          <li key={label}>
            <a className={styles.link} href={href}>
              <span className={styles.linkLabel}>{label}</span>
              <span className={styles.linkHost}>{host}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
    <Specimen theme={theme} onThemeChange={setTheme} />
    <section className={styles.packages} aria-labelledby="packages">
      <h2 id="packages" className={styles.h2}>
        Packages
      </h2>
      <dl className={styles.packageList}>
        {PACKAGES.map(([name, description]) => (
          <div key={name} className={styles.packageRow}>
            <dt>
              <a className={styles.packageName} href={`https://www.npmjs.com/package/${name}`}>
                {name}
              </a>
            </dt>
            <dd className={styles.packageDescription}>{description}</dd>
          </div>
        ))}
      </dl>
    </section>
  </main>
);

Home.displayName = 'Home';

const NotFound = () => (
  <main className={styles.main}>
    <section className={styles.intro}>
      <h1 className={styles.headline}>Nothing here.</h1>
      <p className={styles.lede}>
        This page doesn’t exist. <a href="/">Go to the home page</a>.
      </p>
    </section>
  </main>
);

NotFound.displayName = 'NotFound';

export const App = ({ notFound }: { notFound: boolean }) => {
  const [theme, setTheme] = useSiteTheme();
  return (
    <AppRoot theme={themeOf(theme).theme}>
      <div className={styles.page}>
        <header className={styles.header}>
          <Logo />
          <ThemeSwitcher value={theme} onChange={setTheme} />
        </header>
        {notFound ? <NotFound /> : <Home theme={theme} setTheme={setTheme} />}
        <footer className={styles.footer}>Not affiliated with Discord.</footer>
      </div>
    </AppRoot>
  );
};

App.displayName = 'App';
