import { CALCUL_LITTERAL_3EME_PACK } from './calculLitteral3eme.js';
import { EQUATIONS_3EME_PACK } from './equations3eme.js';
import { FRACTIONS_PACK } from './fractions.js';

export const DEFAULT_TRAINER_PACK_ID=EQUATIONS_3EME_PACK.id;

export const TRAINER_PACKS=Object.freeze({
  [EQUATIONS_3EME_PACK.id]:EQUATIONS_3EME_PACK,
  [CALCUL_LITTERAL_3EME_PACK.id]:CALCUL_LITTERAL_3EME_PACK,
  [FRACTIONS_PACK.id]:FRACTIONS_PACK
});

export function getTrainerPack(id){
  return TRAINER_PACKS[id]||null;
}

export function resolveTrainerPack(search='',defaultPackId=DEFAULT_TRAINER_PACK_ID){
  const requested=new URLSearchParams(search).get('pack');
  return getTrainerPack(requested)||getTrainerPack(defaultPackId)||EQUATIONS_3EME_PACK;
}
