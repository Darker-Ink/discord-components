import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Card, CopyInput, Select, Switch, Text } from '@discord-mana/components';
import { DEMO_PREVIEW_ID, type PreviewTheme, type ResizeMessage } from '../../shared/api';
import { DENSITIES, GROUP_SPACINGS, serializeViewParams, type Density, type GroupSpacing } from '../viewParams';
import { copyText } from './clipboard';
import { CodeBlock } from './CodeBlock';
import styles from './Home.module.css';

const option = <T,>(value: T, label: string) => ({ id: String(value), label, value });

const SPACING_OPTIONS = GROUP_SPACINGS.map((value) => option<GroupSpacing>(value, `${value}px`));
const DENSITY_OPTIONS = DENSITIES.map((value) => option<Density>(value, value[0].toUpperCase() + value.slice(1)));
const PADDING_OPTIONS = [0, 8, 16, 24, 32].map((value) => option(value, `${value}px`));

/** Grows an iframe to the height its preview reports. */
const useFrameHeight = (frame: HTMLIFrameElement | null) => {
  const [height, setHeight] = useState(480);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (frame == null || event.source !== frame.contentWindow) return;
      const data = event.data as Partial<ResizeMessage> | null;
      if (data?.type === 'discord-mana:resize' && typeof data.height === 'number') setHeight(data.height);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frame]);
  return height;
};

export const LiveExample = ({ theme }: { theme: PreviewTheme }) => {
  const [spacing, setSpacing] = useState<GroupSpacing>(16);
  const [density, setDensity] = useState<Density>('default');
  const [padding, setPadding] = useState(16);
  const [transparent, setTransparent] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [dates, setDates] = useState(true);
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);
  const height = useFrameHeight(frame);
  const [copied, setCopied] = useState(false);
  const copiedTimeout = useRef<number | undefined>(undefined);

  const path = useMemo(() => {
    const query = serializeViewParams({
      theme,
      spacing,
      density,
      padding,
      bg: transparent ? 'transparent' : 'default',
      chrome,
      dates,
    });
    return `/p/${DEMO_PREVIEW_ID}${query !== '' ? `?${query}` : ''}`;
  }, [theme, spacing, density, padding, transparent, chrome, dates]);
  const url = `${window.location.origin}${path}`;
  const snippet = `<iframe src="${url}"\n  style="width: 100%; border: 0" title="Discord messages"></iframe>`;

  return (
    <div className={styles.example}>
      <Card className={clsx(styles.card, styles.controls)}>
        <Text variant="heading-md/semibold" color="text-strong" tag="h3">
          Look
        </Text>
        <Text variant="body-sm/normal" color="text-muted">
          The theme follows the switcher at the top of the page.
        </Text>
        <Select
          label="Group spacing"
          selectionMode="single"
          options={SPACING_OPTIONS}
          value={spacing}
          onSelectionChange={(value) => setSpacing(value ?? 16)}
        />
        <Select
          label="UI density"
          selectionMode="single"
          options={DENSITY_OPTIONS}
          value={density}
          onSelectionChange={(value) => setDensity(value ?? 'default')}
        />
        <Select
          label="Padding"
          selectionMode="single"
          options={PADDING_OPTIONS}
          value={padding}
          onSelectionChange={(value) => setPadding(value ?? 16)}
        />
        <Switch label="Channel header" checked={chrome} onChange={setChrome} />
        <Switch label="Date dividers" checked={dates} onChange={setDates} />
        <Switch label="Transparent background" checked={transparent} onChange={setTransparent} />
      </Card>
      <div className={styles.exampleOutput}>
        <div className={clsx(styles.frameWrap, { [styles.frameChecker]: transparent })}>
          <iframe
            ref={setFrame}
            className={styles.frame}
            src={path}
            title="Example preview"
            style={{ height }}
            data-testid="example-frame"
          />
        </div>
        <CopyInput
          value={url}
          mode={copied ? 'success' : 'default'}
          text={copied ? 'Copied' : 'Copy'}
          onCopy={async (value) => {
            setCopied(await copyText(value, 'Preview URL'));
            window.clearTimeout(copiedTimeout.current);
            copiedTimeout.current = window.setTimeout(() => setCopied(false), 1500);
          }}
        />
        <CodeBlock label="Embed it" code={snippet} />
      </div>
    </div>
  );
};

LiveExample.displayName = 'LiveExample';
