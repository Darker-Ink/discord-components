import { useMemo, useState, type ReactNode } from 'react';
import { SearchBar, Stack, TabBar, Text } from '@discord-components/components';
import type { StoryGroup } from './types';

interface StorySidebarProps {
  groups: StoryGroup[];
  selectedStory: string | null;
  onStorySelect: (id: string) => void;
}

// Discord wraps each group in a Fragment, which TabBar clones like an item: the stories inside don't get
// the bar's item type and look. A plain wrapper renders the same without React's Fragment prop warning.
const GroupItems = ({ children }: { children: ReactNode }) => children;

GroupItems.displayName = 'GroupItems';

// Story search and the list of stories by group.
export const StorySidebar = ({ groups, selectedStory, onStorySelect }: StorySidebarProps) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (query.trim() === '') return groups;
    const search = query.toLowerCase();
    return groups
      .map((group) => ({ ...group, stories: group.stories.filter((s) => s.name.toLowerCase().includes(search)) }))
      .filter((group) => group.stories.length > 0);
  }, [groups, query]);

  return (
    <>
      <Stack style={{ marginBottom: 'var(--space-12)' }}>
        <SearchBar
          size="sm"
          query={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
          placeholder="Search stories…"
          aria-label="Search stories"
        />
      </Stack>
      {filtered.length === 0 ? (
        <Text variant="body-sm/normal" color="text-muted">
          No results
        </Text>
      ) : (
        <TabBar
          selectedItem={selectedStory}
          orientation="vertical"
          onItemSelect={(id) => {
            if (id != null) onStorySelect(String(id));
          }}
        >
          {filtered.map((group, index) => (
            <GroupItems key={group.title}>
              <TabBar.Header>{group.title}</TabBar.Header>
              {group.stories.map((story) => (
                <TabBar.Item
                  key={story.id}
                  selectedItem={selectedStory}
                  id={story.id}
                  aria-label={story.name}
                  onItemSelect={() => onStorySelect(story.id)}
                >
                  <span data-testid={`playground-story-${story.id}`}>{story.name}</span>
                </TabBar.Item>
              ))}
              {index < filtered.length - 1 && <TabBar.Separator />}
            </GroupItems>
          ))}
        </TabBar>
      )}
    </>
  );
};

StorySidebar.displayName = 'StorySidebar';
