import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, CopyInput, CopyInputModes, InlineNotice, Text, TextInput } from '@discord-mana/components';
import { KeyIcon } from '@discord-mana/icons';
import type { ApiErrorBody, CreatedKey } from '../../shared/api';
import { copyText } from './clipboard';
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

export const CreateKeyCard = () => {
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
      setState({ status: 'error', message: 'Could not reach the server. Check your connection and try again.' });
    }
  };

  return (
    <Card className={styles.card} id="create-key">
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>
          <KeyIcon size="md" color="currentColor" />
        </span>
        <div>
          <Text variant="heading-lg/semibold" color="text-strong" tag="h2">
            Create an API key
          </Text>
          <Text variant="body-sm/normal" color="text-muted">
            No account needed. A key can create, list, sign and delete its own previews.
          </Text>
        </div>
      </div>
      {state.status === 'created' ? (
        <div className={styles.stack}>
          <InlineNotice
            type="warning"
            title="Copy your key now"
            message="This is the only time it is shown. Only a hash of it is stored, so a lost key can't be recovered; create a new one instead."
          />
          <CopyKey value={state.key.key} />
          <Text variant="body-sm/normal" color="text-muted">
            Send it as <code className={styles.inlineCode}>Authorization: Bearer {'<key>'}</code>. Treat it like a
            password: keep it on your server, never in client-side code.
          </Text>
          <div>
            <Button
              variant="secondary"
              size="sm"
              text="Create another key"
              onClick={() => setState({ status: 'idle' })}
            />
          </div>
        </div>
      ) : (
        <form className={styles.stack} onSubmit={submit}>
          <TextInput
            label="Key name"
            description="Optional. Helps you tell keys apart, e.g. the bot or app using it."
            placeholder="my-transcript-bot"
            value={name}
            onChange={setName}
            maxLength={64}
            disabled={state.status === 'loading'}
          />
          {state.status === 'error' ? <InlineNotice type="critical" message={state.message} /> : null}
          <div>
            <Button
              type="submit"
              variant="primary"
              text="Create API key"
              icon={KeyIcon}
              loading={state.status === 'loading'}
            />
          </div>
        </form>
      )}
    </Card>
  );
};

CreateKeyCard.displayName = 'CreateKeyCard';
