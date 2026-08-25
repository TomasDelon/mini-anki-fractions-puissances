import { createWorkspace } from '../trainer/core.js';

export const EQUATIONS_3EME_PACK = Object.freeze({
  id:'equations-3eme',
  version:1,
  locale:'fr-FR',
  level:'3eme',
  title:'Algèbre',
  workspace:createWorkspace({
    layout:'relations',
    relationMode:'automatic',
    allowedRelations:['iff'],
    defaultRelation:'iff'
  }),
  keyboard:Object.freeze({
    profile:'equations-3eme',
    mobileMode:'full',
    desktopMode:'full'
  }),
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
