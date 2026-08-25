import { CATEGORIES, CATEGORY_INFO, generateExercise, randomSeed } from '../exercises.js';
import { createWorkspace } from '../trainer/core.js';
import { validateEquationDerivation } from '../trainer/equationRelations.js';
import { defineTrainerPack } from '../trainer/pack.js';

const WORKSPACE=createWorkspace({
  layout:'relations',
  relationMode:'automatic',
  allowedRelations:['iff'],
  defaultRelation:'iff'
});

const SKILLS=Object.freeze({
  'equation-isolation':{
    title:'Isoler l’inconnue',
    hint:'Effectue la même opération des deux côtés pour isoler x.'
  },
  'unknown-both-sides':{
    title:'Inconnue des deux côtés',
    hint:'Regroupe d’abord tous les termes en x d’un même côté.',
    prerequisites:['equation-isolation']
  },
  distributivity:{
    title:'Développer une expression',
    hint:'Développe les parenthèses avant d’isoler x.'
  },
  'constant-fractions':{
    title:'Équations avec fractions constantes',
    hint:'Élimine le dénominateur en multipliant les deux membres par la même constante.',
    prerequisites:['equation-isolation']
  },
  'square-root':{
    title:'Carré et racine carrée',
    hint:'Isole d’abord le carré, puis pense aux deux signes lorsque deux racines réelles sont possibles.'
  },
  'common-factor':{
    title:'Mettre en facteur',
    hint:'Cherche le facteur commun x avant de résoudre.'
  },
  'zero-product':{
    title:'Produit nul',
    hint:'Quand un produit vaut zéro, annule chaque facteur séparément.'
  },
  'remarkable-identities':{
    title:'Identités remarquables',
    hint:'Reconnais l’identité remarquable avant de résoudre l’équation.'
  }
});

const CATEGORY_SKILLS=Object.freeze({
  simple:['equation-isolation'],
  linear:['equation-isolation'],
  'both-sides':['unknown-both-sides','equation-isolation'],
  parentheses:['distributivity','equation-isolation'],
  fractions:['constant-fractions','equation-isolation'],
  squares:['square-root'],
  'pure-quadratic':['square-root','equation-isolation'],
  'common-factor':['common-factor','zero-product'],
  identities:['remarkable-identities','zero-product'],
  mixed:Object.keys(SKILLS)
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
  session:Object.freeze({
    legacyKeys:Object.freeze(['algebre-3eme-session-v3','algebre-3eme-session-v2'])
  }),
  skills:SKILLS,
  categorySkills:CATEGORY_SKILLS,
  training:Object.freeze({
    adaptiveMixed:true,
    mixedCategory:'mixed',
    sampleSize:14,
    recentCategoryPenalty:0.16,
    exploration:0.12
  }),
  generateExercise,
  nextSeed:randomSeed,
  validateExercise(exercise,rows){
    return validateEquationDerivation(exercise,rows,exercise.workspace||WORKSPACE);
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

export default EQUATIONS_3EME_PACK;
