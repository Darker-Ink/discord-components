import { useState } from 'react';
import { Anchor, Button, Popout, Text, TextInput } from '@discord-mana/components';
import { WindowLaunchIcon } from '@discord-mana/icons';
import { toPreviewMessage, useBuilderStore, type BuilderAuthor } from '@discord-mana/builders';
import type { SiteTheme } from './theme';
import styles from './App.module.css';

const PREVIEW_API = 'https://preview.discord-mana.dev/api/previews';

const usePreviewBody = (author: BuilderAuthor, theme: SiteTheme) => {
  const store = useBuilderStore();
  return () => ({
    data: {
      messages: [
        toPreviewMessage(store.getState().doc, {
          author,
          timestamp: new Date().toISOString(),
          channelId: '1300000000000000003',
        }),
      ],
    },
    options: { title: 'message-builder', theme },
  });
};

/**
 * "Open as preview": a hosted page of the message on preview.discord-mana.dev. That needs an API key (made on
 * its home page); without one, the request body can be copied to send yourself. The key is never stored.
 */
export const PreviewButton = ({ author, theme }: { author: BuilderAuthor; theme: SiteTheme }) => {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<{ kind: 'idle' | 'busy' | 'error' | 'copied'; message?: string }>({
    kind: 'idle',
  });
  const body = usePreviewBody(author, theme);
  const open = async () => {
    // Opened now, while the click still counts, so the browser doesn't block it as a popup.
    const tab = window.open('about:blank', '_blank');
    setStatus({ kind: 'busy' });
    try {
      const response = await fetch(PREVIEW_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.trim()}` },
        body: JSON.stringify(body()),
      });
      const json = (await response.json().catch(() => null)) as {
        url?: string | null;
        error?: { message?: string };
      } | null;
      if (!response.ok || json?.url == null) throw new Error(json?.error?.message ?? `HTTP ${response.status}`);
      if (tab != null) tab.location.href = json.url;
      else window.open(json.url, '_blank');
      setStatus({ kind: 'idle' });
    } catch (error) {
      tab?.close();
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  };
  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(body(), null, 2));
    setStatus({ kind: 'copied' });
  };
  return (
    <Popout
      position="bottom"
      align="right"
      renderPopout={() => (
        <div className={styles.previewPopout} role="dialog" aria-label="Open as preview">
          <Text variant="heading-sm/semibold" color="text-strong">
            Open as preview
          </Text>
          <TextInput
            label="API key"
            type="password"
            revealable
            value={key}
            placeholder="dm_…"
            onChange={setKey}
            errorMessage={status.kind === 'error' ? status.message : undefined}
            description={<Anchor href="https://preview.discord-mana.dev">Get a key</Anchor>}
            autoComplete="off"
          />
          <div className={styles.previewActions}>
            <Button
              variant="secondary"
              size="sm"
              text={status.kind === 'copied' ? 'Copied' : 'Copy request body'}
              onClick={() => void copy()}
            />
            <Button
              size="sm"
              text={status.kind === 'busy' ? 'Opening…' : 'Open preview'}
              disabled={key.trim() === '' || status.kind === 'busy'}
              onClick={() => void open()}
            />
          </div>
        </div>
      )}
    >
      {(props) => (
        <Button
          size="sm"
          variant="secondary"
          icon={{ type: 'icon', asset: WindowLaunchIcon }}
          text="Open as preview"
          {...props}
        />
      )}
    </Popout>
  );
};

PreviewButton.displayName = 'PreviewButton';
