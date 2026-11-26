import { useCallback, useMemo, useRef } from 'react';
import { IconButton, Menu, MenuItem, Popout, showToast } from '@discord-mana/components';
import { ChevronSmallDownIcon, CopyIcon } from '@discord-mana/icons';
import { playgroundStore } from './playgroundStore';
import styles from './Playground.module.css';
import { getChangedProps } from './storyProps';
import type { Collection, Story } from './types';

type Props = Record<string, unknown>;

const noop = () => {};

// Discord links to `dev://playground/<collection>/<story>`; ours point at this page with the same
// query parameters the playground reads on load.
const getPlaygroundLink = (
  collection: Collection,
  story: Story | null,
  withConfiguration: boolean,
  props: Props | null,
  defaults: Props | null,
) => {
  const params = new URLSearchParams({ collection: collection.id });
  if (story != null) params.set('story', story.id);
  if (withConfiguration && story != null) {
    for (const [key, value] of Object.entries(getChangedProps(story, props, defaults))) params.set(key, value);
  }
  return `${window.location.origin}${window.location.pathname}?${params}`;
};

const copyLink = async (link: string) => {
  if (typeof navigator.clipboard?.writeText !== 'function') return;
  try {
    await navigator.clipboard.writeText(link);
    showToast({ text: 'Copied playground link', variant: 'success' });
  } catch {
    // Clipboard access can be denied; nothing to report without the client's error tracking.
  }
};

interface CopyLinkButtonProps {
  collection: Collection;
  story: Story | null;
}

// Copies a link to the story; once controls are changed, a menu also offers the link with them.
export const CopyLinkButton = ({ collection, story }: CopyLinkButtonProps) => {
  const currentProps = playgroundStore.useField('currentProps');
  const currentDefaults = playgroundStore.useField('currentDefaults');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const hasConfiguration = useMemo(
    () => story != null && Object.keys(getChangedProps(story, currentProps, currentDefaults)).length > 0,
    [story, currentProps, currentDefaults],
  );
  const copyWithConfiguration = useCallback(
    () => copyLink(getPlaygroundLink(collection, story, true, currentProps, currentDefaults)),
    [collection, story, currentProps, currentDefaults],
  );
  const copyCleanLink = useCallback(
    () => copyLink(getPlaygroundLink(collection, story, false, currentProps, currentDefaults)),
    [collection, story, currentProps, currentDefaults],
  );

  if (!hasConfiguration) {
    return (
      <IconButton
        size="sm"
        aria-label="Copy Link"
        variant="icon-only"
        icon={CopyIcon}
        onClick={copyWithConfiguration}
      />
    );
  }
  return (
    <div role="group" aria-label="Copy playground link" className={styles.copyLinkSplit}>
      <IconButton
        size="sm"
        aria-label="Copy link with configuration"
        variant="icon-only"
        icon={CopyIcon}
        onClick={copyWithConfiguration}
      />
      <Popout
        targetElementRef={menuButtonRef}
        renderPopout={({ closePopout }) => (
          <Menu
            data-menu-migrated
            onSelect={noop}
            navId="playground-copy-link-menu"
            onClose={closePopout}
            aria-label="Copy link options"
          >
            <MenuItem
              id="copy-link-with-config"
              label="Copy link with configuration"
              action={() => {
                closePopout();
                void copyWithConfiguration();
              }}
            />
            <MenuItem
              id="copy-link-clean"
              label="Copy clean link"
              action={() => {
                closePopout();
                void copyCleanLink();
              }}
            />
          </Menu>
        )}
        position="bottom"
        align="center"
        animation={Popout.Animation.SCALE}
        onRequestClose={noop}
      >
        {(triggerProps) => (
          <IconButton
            size="sm"
            aria-haspopup="menu"
            aria-label="More copy link options"
            variant="icon-only"
            icon={ChevronSmallDownIcon}
            {...triggerProps}
            buttonRef={menuButtonRef}
          />
        )}
      </Popout>
    </div>
  );
};

CopyLinkButton.displayName = 'CopyLinkButton';
