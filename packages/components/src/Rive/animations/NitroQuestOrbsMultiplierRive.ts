import { createRiveAnimation } from './createRiveAnimation';

export const NitroQuestOrbsMultiplierRive = createRiveAnimation('NitroQuestOrbsMultiplierRive', {
  src: 'https://cdn.discordapp.com/assets/content/a5e059af7c16750f382df02ee50c55be2ee90575e42ff1790aa2067c7c890a16.riv',
  defaultArtboard: 'Torbs_Multiply',
  artboardProperties: {
    Torbs_Multiply: { reducedMotion: 'boolean' },
    Shards_All_Nitro: { reducedMotion: 'boolean' },
    'Orb Mid Shine': { reducedMotion: 'boolean' },
    Torbs_Shine: { reducedMotion: 'boolean' },
  },
  artboardViewModelInstances: {
    Torbs_Multiply: ['Instance'],
    Shards_All_Nitro: ['Instance'],
    'Orb Mid Shine': ['Instance'],
    Torbs_Shine: ['Instance'],
  },
  artboardStateMachines: {
    Torbs_Multiply: ['SM_Torbs_Multiply'],
    Shards_All_Nitro: ['Shard_Burst'],
    'Orb Mid Shine': ['State Machine 1'],
    Torbs_Shine: ['SM_Torbs'],
  },
});
