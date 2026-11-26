import { useEffect } from 'react';
import { closeModal } from '@discord-components/components';
import {
  MediaContextProvider,
  openInteractionModal,
  type APIModalInteractionResponseCallbackData,
  type InteractionModalApplication,
} from '@discord-components/messages';
import type { StoryGroup } from '../../types';

interface ModalFixtureData {
  modal: APIModalInteractionResponseCallbackData;
  application?: InteractionModalApplication;
}

const modalFixtureFiles = import.meta.glob<{ story: string; data: ModalFixtureData }>(
  '../../../../../scripts/fixtures/modal/*.json',
  { eager: true, import: 'default' },
);

const ASSETS = `${window.location.origin}/messages`;
const withAssets = <T,>(value: T): T => JSON.parse(JSON.stringify(value).replaceAll('{{assets}}', ASSETS));

const modalFixtures = Object.fromEntries(
  Object.entries(modalFixtureFiles)
    .map(
      ([file, fixture]) =>
        [
          `modal/${file
            .split('/')
            .pop()!
            .replace(/\.json$/, '')}`,
          withAssets(fixture.data),
        ] as const,
    )
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
);

const DEFAULT_APPLICATION: InteractionModalApplication = { id: '1000000000000000002', name: 'Helper', icon: null };

/** Opens the fixture's modal like the reference renderer does (scripts/fixtures/modal/reference.js). */
const InteractionModalFixture = ({ fixture }: { fixture: string }) => {
  const data = modalFixtures[fixture];
  useEffect(() => {
    if (data == null) return;
    const key = openInteractionModal({ modal: data.modal, application: data.application ?? DEFAULT_APPLICATION });
    return () => {
      closeModal(key);
    };
  }, [data]);
  return (
    <MediaContextProvider isWindowFocused={false}>
      <div />
    </MediaContextProvider>
  );
};

InteractionModalFixture.displayName = 'InteractionModalFixture';

const components: StoryGroup = {
  title: 'Components',
  stories: [
    {
      name: 'Interaction Modal Fixtures',
      id: 'interaction-modal-fixtures',
      component: InteractionModalFixture,
      docs: 'The modal payloads scripts/compare-messages.mjs opens with Discord’s modules.',
      controls: {
        fixture: {
          label: 'Fixture',
          type: 'select',
          defaultValue: Object.keys(modalFixtures)[0],
          options: Object.keys(modalFixtures).map((name) => ({ label: name, value: name })),
        },
      },
    },
  ],
};

export default components;
