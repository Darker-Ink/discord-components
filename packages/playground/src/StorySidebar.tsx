import { Fragment, useMemo, useState } from 'react';
import { SearchBar, Stack, Text } from '@discord-components/components';
import { StoryTabBar, StoryTabBarHeader, StoryTabBarItem, StoryTabBarSeparator } from './sidebar/StoryTabBar';
import type { StoryGroup } from './types';

interface StorySidebarProps {
  groups: StoryGroup[];
  selectedStory: string | null;
  onStorySelect: (id: string) => void;
}

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
        <StoryTabBar>
          {filtered.map((group, index) => (
            <Fragment key={group.title}>
              <StoryTabBarHeader>{group.title}</StoryTabBarHeader>
              {group.stories.map((story) => (
                <StoryTabBarItem
                  key={story.id}
                  id={story.id}
                  selected={story.id === selectedStory}
                  onSelect={() => onStorySelect(story.id)}
                  aria-label={story.name}
                >
                  <span data-testid={`playground-story-${story.id}`}>{story.name}</span>
                </StoryTabBarItem>
              ))}
              {index < filtered.length - 1 && <StoryTabBarSeparator />}
            </Fragment>
          ))}
        </StoryTabBar>
      )}
    </>
  );
};

StorySidebar.displayName = 'StorySidebar';
