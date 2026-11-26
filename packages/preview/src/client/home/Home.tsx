import { useEffect, type ReactNode } from 'react';
import { AppRoot, Button, Text } from '@discord-mana/components';
import { AngleBracketsIcon, ChatIcon, LinkIcon, LockIcon } from '@discord-mana/icons';
import { CreateKeyCard } from './CreateKeyCard';
import { ApiDocs, EmbeddingDocs, LimitsDocs } from './Docs';
import { LiveExample } from './LiveExample';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useHomeTheme } from './useHomeTheme';
import { THEME_CLASSES } from '../viewParams';
import styles from './Home.module.css';

const NAV = [
  ['#create-key', 'Get a key'],
  ['#example', 'Example'],
  ['#api', 'API'],
  ['#embedding', 'Embedding'],
  ['#limits', 'Limits'],
] as const;

const Logo = () => (
  <svg className={styles.logo} viewBox="0 0 32 32" aria-hidden>
    <rect width="32" height="32" rx="9" fill="var(--brand-500, #5865f2)" />
    <path
      fill="#fff"
      d="M9 10.5A2.5 2.5 0 0 1 11.5 8h9A2.5 2.5 0 0 1 23 10.5v7a2.5 2.5 0 0 1-2.5 2.5H15l-4.2 3.4c-.5.4-1.3 0-1.3-.6V20H11.5A2.5 2.5 0 0 1 9 17.5z"
    />
    <rect x="12" y="11.5" width="8" height="1.8" rx=".9" fill="var(--brand-500, #5865f2)" />
    <rect x="12" y="15" width="5.5" height="1.8" rx=".9" fill="var(--brand-500, #5865f2)" />
  </svg>
);

Logo.displayName = 'Logo';

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
    <Text variant="heading-xl/semibold" color="text-strong" tag="h2" id={`${id}-title`} className={styles.sectionTitle}>
      {title}
    </Text>
    {children}
  </section>
);

Section.displayName = 'Section';

const STEPS = [
  {
    icon: ChatIcon,
    title: 'Send messages',
    text: 'POST the messages as Discord’s API returns them: embeds, attachments, Components v2.',
  },
  {
    icon: LinkIcon,
    title: 'Get a link',
    text: 'Public previews get a URL right away. Embed it in an iframe or link to it.',
  },
  {
    icon: LockIcon,
    title: 'Or keep it secret',
    text: 'Secret previews only open through short-lived signed links you hand out.',
  },
  {
    icon: AngleBracketsIcon,
    title: 'Make it yours',
    text: 'Theme, spacing and more are URL params. Interactive components are off by default.',
  },
];

const NotFound = () => (
  <div className={styles.notFound}>
    <Text variant="heading-xl/semibold" color="text-strong" tag="h1">
      Page not found
    </Text>
    <Text variant="body-md/normal" color="text-muted">
      There is nothing at this address.
    </Text>
    <Button variant="primary" text="Go home" onClick={() => window.location.assign('/')} />
  </div>
);

NotFound.displayName = 'NotFound';

export const Home = ({ notFound }: { notFound: boolean }) => {
  const [theme, setTheme] = useHomeTheme();
  useEffect(() => {
    document.title = notFound ? 'Not found · discord-mana preview' : 'discord-mana preview';
  }, [notFound]);

  return (
    <AppRoot theme={THEME_CLASSES[theme]}>
      <div className={styles.page}>
        <header className={styles.topbar}>
          <div className={styles.topbarInner}>
            <a href="/" className={styles.brand}>
              <Logo />
              <Text variant="heading-md/semibold" color="text-strong" tag="span">
                discord-mana <span className={styles.brandMuted}>preview</span>
              </Text>
            </a>
            {notFound ? null : (
              <nav className={styles.nav} aria-label="Sections">
                {NAV.map(([href, label]) => (
                  <a key={href} href={href} className={styles.navLink}>
                    {label}
                  </a>
                ))}
              </nav>
            )}
            <ThemeSwitcher value={theme} onChange={setTheme} />
          </div>
        </header>
        {notFound ? (
          <NotFound />
        ) : (
          <main className={styles.main}>
            <section className={styles.hero}>
              <Text variant="heading-xxl/semibold" color="text-strong" tag="h1" className={styles.heroTitle}>
                Discord messages, rendered anywhere.
              </Text>
              <Text variant="body-lg/normal" color="text-muted" tag="p" className={styles.heroText}>
                A small API that turns Discord message JSON into a hosted, embeddable page that looks exactly like the
                client. Made for ticket transcripts, logs, docs and dashboards. Built with the discord-mana components.
              </Text>
              <div className={styles.heroActions}>
                <Button
                  variant="primary"
                  size="md"
                  text="Get an API key"
                  onClick={() => document.getElementById('create-key')?.scrollIntoView({ behavior: 'smooth' })}
                />
                <Button
                  variant="secondary"
                  size="md"
                  text="Read the API docs"
                  onClick={() => document.getElementById('api')?.scrollIntoView({ behavior: 'smooth' })}
                />
              </div>
            </section>

            <div className={styles.intro}>
              <ol className={styles.steps}>
                {STEPS.map(({ icon: Icon, title, text }) => (
                  <li key={title} className={styles.step}>
                    <span className={styles.stepIcon}>
                      <Icon size="sm" color="currentColor" />
                    </span>
                    <div>
                      <Text variant="body-md/semibold" color="text-strong">
                        {title}
                      </Text>
                      <Text variant="body-sm/normal" color="text-muted">
                        {text}
                      </Text>
                    </div>
                  </li>
                ))}
              </ol>
              <CreateKeyCard />
            </div>

            <Section id="example" title="Live example">
              <LiveExample theme={theme} />
            </Section>
            <Section id="api" title="API">
              <ApiDocs />
            </Section>
            <Section id="embedding" title="Embedding and URL params">
              <EmbeddingDocs />
            </Section>
            <Section id="limits" title="Limits">
              <LimitsDocs />
            </Section>
          </main>
        )}
        <footer className={styles.footer}>
          <Text variant="body-sm/normal" color="text-muted">
            Not affiliated with Discord. Previews show what their creators send; report abuse to the site operator.
          </Text>
        </footer>
      </div>
    </AppRoot>
  );
};

Home.displayName = 'Home';
