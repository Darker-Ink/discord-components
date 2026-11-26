import { useEffect } from 'react';
import { AppRoot, Button, Text } from '@discord-mana/components';
import { DEMO_PREVIEW_ID } from '../../shared/api';
import { SiteFooter } from '../site/SiteFooter';
import { SiteHeader } from '../site/SiteHeader';
import { useSiteTheme } from '../site/useSiteTheme';
import siteStyles from '../site/Site.module.css';
import { THEME_CLASSES } from '../viewParams';
import { KeyForm } from './KeyForm';
import styles from './Home.module.css';

const NotFound = () => (
  <main className={styles.notFound}>
    <Text variant="heading-xl/semibold" color="text-strong" tag="h1">
      Page not found
    </Text>
    <Text variant="body-md/normal" color="text-muted">
      There&apos;s nothing at this address.
    </Text>
    <Button variant="secondary" text="Go to the home page" onClick={() => window.location.assign('/')} />
  </main>
);

NotFound.displayName = 'NotFound';

export const Home = ({ notFound }: { notFound: boolean }) => {
  const [theme, setTheme] = useSiteTheme();
  useEffect(() => {
    document.title = notFound ? 'Not found · discord-mana preview' : 'discord-mana preview: Discord messages as a link';
  }, [notFound]);
  const demo = `/p/${DEMO_PREVIEW_ID}?theme=${theme}&chrome=1&welcome=0`;

  return (
    <AppRoot theme={THEME_CLASSES[theme]}>
      <div className={siteStyles.page}>
        <SiteHeader page={notFound ? 'other' : 'home'} theme={theme} onThemeChange={setTheme} />
        {notFound ? (
          <NotFound />
        ) : (
          <main className={styles.main}>
            <section className={styles.intro} id="key">
              <h1 className={styles.headline}>Share Discord messages as a link.</h1>
              <p className={styles.lede}>
                Send message JSON from your bot and get back a page that renders it exactly like Discord, ready to link
                to or embed. Made for ticket transcripts and logs.
              </p>
              <KeyForm />
              <a className={styles.docsLink} href="/docs">
                Read the docs
              </a>
            </section>
            <figure className={styles.example}>
              <div className={styles.window}>
                <iframe className={styles.frame} src={demo} title="Example preview" data-testid="example-frame" />
              </div>
              <figcaption className={styles.caption}>
                A live preview at <a href={demo}>/p/demo</a>. It follows the theme you pick above.
              </figcaption>
            </figure>
          </main>
        )}
        <SiteFooter />
      </div>
    </AppRoot>
  );
};

Home.displayName = 'Home';
