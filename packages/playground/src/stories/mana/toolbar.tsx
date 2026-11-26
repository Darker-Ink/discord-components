import { useState } from 'react';
import { Button, Checkbox, IconButton, ToggleIconButton, Toolbar, Tooltip } from '@discord-components/components';
import { ClydeIcon, MicrophoneIcon, MicrophoneSlashIcon } from '@discord-components/icons';
import type { StoryGroup } from '../../types';

const ToolbarStory = () => {
  const [muted, setMuted] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const muteLabel = muted ? 'Unmute microphone' : 'Mute microphone';
  return (
    <Toolbar aria-label="Message actions">
      <Toolbar.Group aria-label="Response actions">
        <Button variant="secondary" text="Reply" />
        <Tooltip text="More options">
          <IconButton variant="secondary" icon={ClydeIcon} aria-label="More options" />
        </Tooltip>
      </Toolbar.Group>
      <Toolbar.Separator />
      <Toolbar.Group aria-label="Message options">
        <Tooltip text={muteLabel}>
          <ToggleIconButton
            icon={MicrophoneIcon}
            selectedIcon={MicrophoneSlashIcon}
            pressed={muted}
            aria-label={muteLabel}
            onClick={() => setMuted((value) => !value)}
          />
        </Tooltip>
        <Checkbox label="Include attachments" checked={includeAttachments} onChange={setIncludeAttachments} />
      </Toolbar.Group>
    </Toolbar>
  );
};

ToolbarStory.displayName = 'ToolbarStory';

const toolbar: StoryGroup = {
  title: 'Toolbar',
  stories: [{ name: 'Toolbar', id: 'toolbar', component: ToolbarStory, controls: {} }],
};

export default toolbar;
