import { createRiveAnimation } from './createRiveAnimation';

export const GameServerHostingRive = createRiveAnimation('GameServerHostingRive', {
  src: 'https://cdn.discordapp.com/assets/content/03622d5cf6122c0557116bfd66c48955caf9a146c3dc6dcbd53c94fe0fe58a3a.riv',
  defaultArtboard: 'Game_Server_Hosting_Main',
  artboardProperties: {
    Game_Server_Hosting_Main: { reducedMotion: 'boolean' },
    c_chara_5: {},
    hytale_gameplay: { reducedMotion: 'boolean' },
    c_chara_1: {},
    c_chara_4: {},
    c_chara_2: {},
    c_chara_3: {},
  },
  artboardViewModelInstances: {
    Game_Server_Hosting_Main: ['Instance'],
    c_chara_5: [],
    hytale_gameplay: ['Instance'],
    c_chara_1: [],
    c_chara_4: [],
    c_chara_2: [],
    c_chara_3: [],
  },
  artboardStateMachines: {
    Game_Server_Hosting_Main: ['SM_Auto', 'SM_Main_Int'],
    c_chara_5: ['State Machine 1'],
    hytale_gameplay: ['State Machine 1'],
    c_chara_1: ['State Machine 1'],
    c_chara_4: ['State Machine 1'],
    c_chara_2: ['State Machine 1'],
    c_chara_3: ['State Machine 1'],
  },
});
