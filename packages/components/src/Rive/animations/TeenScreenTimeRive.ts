import { createRiveAnimation } from './createRiveAnimation';

export const TeenScreenTimeRive = createRiveAnimation('TeenScreenTimeRive', {
  src: 'https://cdn.discordapp.com/assets/content/0e8095ebdbf89e1289f83a859a892a5790e8a76949d9bf9bb02e4dfc16190d10.riv',
  defaultArtboard: 'Teen Screen Time Illo',
  artboardProperties: {
    'Teen Screen Time Illo': {},
    'Gradient Vertical': {},
    'RAW ILLO (Do not deploy)': {},
    'Gradient Horizontal': {},
  },
  artboardViewModelInstances: {
    'Teen Screen Time Illo': [],
    'Gradient Vertical': [],
    'RAW ILLO (Do not deploy)': [],
    'Gradient Horizontal': [],
  },
  artboardStateMachines: {
    'Teen Screen Time Illo': ['State Machine 1'],
    'Gradient Vertical': ['State Machine 1'],
    'RAW ILLO (Do not deploy)': ['State Machine 1'],
    'Gradient Horizontal': ['State Machine 1'],
  },
});
