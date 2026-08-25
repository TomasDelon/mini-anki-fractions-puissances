import { CALCUL_LITTERAL_3EME_PACK } from './calculLitteral3eme.js';
import { EQUATIONS_3EME_PACK } from './equations3eme.js';

export const TRAINER_PACKS=Object.freeze({
  [EQUATIONS_3EME_PACK.id]:EQUATIONS_3EME_PACK,
  [CALCUL_LITTERAL_3EME_PACK.id]:CALCUL_LITTERAL_3EME_PACK
});

export function getTrainerPack(id){
  return TRAINER_PACKS[id]||null;
}

export function resolveTrainerPack(search=''){
  const requested=new URLSearchParams(search).get('pack');
  return getTrainerPack(requested)||EQUATIONS_3EME_PACK;
}
