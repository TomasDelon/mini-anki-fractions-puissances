import { CATEGORIES, CATEGORY_INFO, generateExercise, randomSeed } from '../exercises.js';
import { validateChain } from '../math.js';
import { createWorkspace, validateDerivation } from '../trainer/core.js';
import { defineTrainerPack } from '../trainer/pack.js';

const WORKSPACE=createWorkspace({
  layout:'relations',
  relationMode:'automatic',
  allowedRelations:['iff'],
  defaultRelation:'iff'
});

export const EQUATIONS_3EME_PACK = defineTrainerPack({
  id:'equations-3eme',
  version:2,
  locale:'fr-FR',
  level:'3eme',
  title:'Algèbre',
  categories:CATEGORIES,
  categoryInfo:CATEGORY_INFO,
  workspace:WORKSPACE,
  keyboard:Object.freeze({
    profile:'equations-3eme',
    mobileMode:'full',
    desktopMode:'full'
  }),
  generateExercise,
  nextSeed:randomSeed,
  validateExercise(exercise,rows){
    return validateDerivation(exercise.promptLatex,rows,WORKSPACE,{iffChain:validateChain});
  },
  pedagogy:Object.freeze({
    domainAnalysis:false,
    allowedTechniques:Object.freeze([
      'linear-isolation',
      'distributivity',
      'constant-denominator-fractions',
      'square-root',
      'common-factor',
      'zero-product',
      'remarkable-identities'
    ]),
    forbiddenTechniques:Object.freeze([
      'discriminant',
      'quadratic-formula',
      'generic-trinomial-root-finding',
      'variable-denominator-domain-analysis'
    ])
  })
});
