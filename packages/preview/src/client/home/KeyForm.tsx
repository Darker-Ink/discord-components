import { useEffect, useState, type FormEvent } from 'react';
import { Button, CopyInput, CopyInputModes, InlineNotice, Text, TextInput } from '@discord-mana/components';
import type { ApiErrorBody, CreatedKey } from '../../shared/api';
import { copyText } from '../site/clipboard';
import styles from './Home.module.css';

type State =
  { status: 'idle' | 'loading' } | { status: 'created'; key: CreatedKey } | { status: 'error'; message: string };

const CopyKey = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);
  return (
    <CopyInput
      value={value}
      mode={copied ? CopyInputModes.SUCCESS : CopyInputModes.DEFAULT}
      text={copied ? 'Copied' : 'Copy'}
      onCopy={async (text) => setCopied(await copyText(text, 'API key'))}
    />
  );
};

CopyKey.displayName = 'CopyKey';

export const KeyForm = () => {
  const [name, setName] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState({ status: 'loading' });
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(name.trim() !== '' ? { name: name.trim() } : {}),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setState({ status: 'error', message: body?.error.message ?? `Request failed (${response.status}).` });
        return;
      }
      setState({ status: 'created', key: (await response.json()) as CreatedKey });
    } catch {
      setState({ status: 'error', message: "Couldn't reach the server. Check your connection and try again." });
    }
  };

  if (state.status === 'created') {
    return (
      <div className={styles.keyCreated} data-testid="key-created">
        <InlineNotice
          type="warning"
          title="Copy your key now"
          message="It's only shown once. Keep it on your server; if you lose it, create a new one."
        />
        <CopyKey value={state.key.key} />
        <Text variant="body-sm/normal" color="text-muted">
          Next, <a href="/docs#creating-previews">create your first preview</a>.
        </Text>
      </div>
    );
  }

  return (
    <form className={styles.keyForm} onSubmit={submit} id="key-form">
      <div className={styles.keyRow}>
        <div className={styles.keyInput}>
          <TextInput
            label="Create an API key"
            placeholder="Key name, e.g. ticket-bot (optional)"
            value={name}
            onChange={setName}
            maxLength={64}
            disabled={state.status === 'loading'}
          />
        </div>
        <Button type="submit" variant="primary" text="Create key" loading={state.status === 'loading'} />
      </div>
      {state.status === 'error' ? <InlineNotice type="critical" message={state.message} /> : null}
      <Text variant="body-sm/normal" color="text-muted">
        No account needed. A key creates, signs and deletes its own previews.
      </Text>
    </form>
  );
};

KeyForm.displayName = 'KeyForm';
