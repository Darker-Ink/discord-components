import { Button, CardTypes, FormNotice, FormTitle, type CardType } from '@discord-components/components';
import type { StoryGroup } from '../../types';

interface FormNoticeStoryProps {
  type: CardType;
  title: string;
  body: string;
  hasButton: boolean;
}

const FormNoticeStory = ({ type, title, body, hasButton }: FormNoticeStoryProps) => (
  <FormNotice type={type} title={title} body={body} button={hasButton ? <Button text="Action" /> : undefined} />
);

FormNoticeStory.displayName = 'FormNoticeStory';

interface FormTitleStoryProps {
  children: string;
  disabled: boolean;
  required: boolean;
  errorMessage: string;
}

const TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'legend'] as const;

const FormTitleStory = ({ children, disabled, required, errorMessage }: FormTitleStoryProps) => {
  const error = errorMessage?.trim() === '' ? undefined : errorMessage;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {TAGS.map((tag) => (
        <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <code style={{ minWidth: '60px', fontSize: '12px', color: '#666' }}>{tag}:</code>
          <FormTitle
            data-migration-pending
            tag={tag}
            disabled={disabled}
            required={required}
            error={error}
            errorId={error != null ? `error-id-${tag}` : undefined}
          >
            {children}
          </FormTitle>
        </div>
      ))}
    </div>
  );
};

FormTitleStory.displayName = 'FormTitleStory';

const formComponents: StoryGroup = {
  title: 'Form Components',
  stories: [
    {
      id: 'formnotice',
      name: 'FormNotice',
      component: FormNoticeStory,
      controls: {
        type: {
          type: 'select',
          label: 'Type',
          defaultValue: CardTypes.DANGER,
          options: [
            { label: 'Primary', value: CardTypes.PRIMARY },
            { label: 'Danger', value: CardTypes.DANGER },
            { label: 'Warning', value: CardTypes.WARNING },
            { label: 'Success', value: CardTypes.SUCCESS },
            { label: 'Brand', value: CardTypes.BRAND },
            { label: 'Custom', value: CardTypes.CUSTOM },
          ],
        },
        title: { type: 'text', label: 'Title', defaultValue: 'Important Notice' },
        body: {
          type: 'text',
          label: 'Body',
          defaultValue: 'This is an important message that you should pay attention to.',
        },
        hasButton: { type: 'boolean', label: 'Has Button', defaultValue: false },
      },
    },
    {
      id: 'formtitle',
      name: 'FormTitle',
      component: FormTitleStory,
      controls: {
        children: { type: 'text', label: 'Title Text', defaultValue: 'Form Title' },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        required: { type: 'boolean', label: 'Required', defaultValue: false },
        errorMessage: { type: 'text', label: 'Error Message', defaultValue: '' },
      },
    },
  ],
};

export default formComponents;
