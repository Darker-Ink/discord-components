import { createRiveAnimation } from './createRiveAnimation';

export const PerfTestRive = createRiveAnimation('PerfTestRive', {
  src: 'https://cdn.discordapp.com/assets/content/a9d4129fe10ee310d96f95d04fbf382b9c26914a30780ebb307e908a826248f2.riv',
  defaultArtboard: 'box-wumpus',
  artboardProperties: {
    'box-wumpus': {},
    '+++1_BOX_nested_comp_0': {},
    '+++1_BOX_nested_comp_4': {},
    '+++1_BOX_nested_comp_1': {},
    '+++1_BOX_nested_comp_2': {},
    '+++1_BOX_nested_comp_3': {},
  },
  artboardViewModelInstances: {
    'box-wumpus': [],
    '+++1_BOX_nested_comp_0': [],
    '+++1_BOX_nested_comp_4': [],
    '+++1_BOX_nested_comp_1': [],
    '+++1_BOX_nested_comp_2': [],
    '+++1_BOX_nested_comp_3': [],
  },
  artboardStateMachines: {
    'box-wumpus': ['State Machine 1'],
    '+++1_BOX_nested_comp_0': [],
    '+++1_BOX_nested_comp_4': [],
    '+++1_BOX_nested_comp_1': [],
    '+++1_BOX_nested_comp_2': [],
    '+++1_BOX_nested_comp_3': [],
  },
});
