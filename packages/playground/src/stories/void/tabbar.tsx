import { useState } from 'react';
import { TabBar, type TabBarItemId, type TabBarLook, type TabBarType } from '@discord-components/components';
import type { StoryGroup } from '../../types';

interface TabBarStoryProps {
  look: TabBarLook;
  type: TabBarType;
  tabCount: number;
}

const TabBarStory = ({ look, type, tabCount }: TabBarStoryProps) => {
  const [selectedItem, setSelectedItem] = useState<TabBarItemId | undefined>('tab1');
  const tabs = Array.from({ length: tabCount }, (_, index) => ({ id: `tab${index + 1}`, name: `Tab ${index + 1}` }));
  return (
    <TabBar type={type} look={look} selectedItem={selectedItem} onItemSelect={setSelectedItem}>
      {tabs.map((tab) => (
        <TabBar.Item key={tab.id} id={tab.id}>
          {tab.name}
        </TabBar.Item>
      ))}
    </TabBar>
  );
};

TabBarStory.displayName = 'TabBarStory';

const tabbar: StoryGroup = {
  title: 'TabBar',
  stories: [
    {
      id: 'tabbar',
      name: 'TabBar',
      component: TabBarStory,
      controls: {
        look: {
          type: 'select',
          label: 'Look',
          defaultValue: 'brand',
          options: [
            { label: 'Brand', value: 'brand' },
            { label: 'Grey', value: 'grey' },
            { label: 'Custom', value: 'custom' },
          ],
        },
        type: {
          type: 'select',
          label: 'Type',
          defaultValue: 'top',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Side', value: 'side' },
            { label: 'Top Pill', value: 'top-pill' },
          ],
        },
        tabCount: { type: 'number', label: 'Number of Tabs', defaultValue: 3 },
      },
    },
  ],
};

export default tabbar;
