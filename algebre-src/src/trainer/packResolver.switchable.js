import activePack from '@active-trainer-pack';
import { resolveTrainerPack } from '../packs/index.js';

export function resolveBootPack(){
  return resolveTrainerPack(location.search,activePack.id);
}
