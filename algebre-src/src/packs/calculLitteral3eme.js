import { RNG, randomSeed } from '../exercises.js';
import { createWorkspace } from '../trainer/core.js';
import { validateEqualityChain } from '../trainer/expressionMath.js';
import { defineTrainerPack } from '../trainer/pack.js';

const CATEGORY_INFO=Object.freeze({
  develop:{title:'Développer',formula:'a(x+b)',difficulty:2},
  'develop-reduce':{title:'Développer et réduire',formula:'a(x+b)+cx+d',difficulty:3},
  reduce:{title:'Réduire',formula:'ax+b+cx+d',difficulty:2},
  mixed:{title:'Mélange',formula:'\\text{calcul littéral}',difficulty:3}
});
const CATEGORIES=Object.freeze(Object.keys(CATEGORY_INFO));
const BASE=Object.freeze(CATEGORIES.filter(category=>category!=='mixed'));

const WORKSPACE=createWorkspace({
  layout:'aligned',
  relationMode:'automatic',
  allowedRelations:['equals'],
  defaultRelation:'equals'
});

const SKILLS=Object.freeze({
  distributivity:{title:'Développer avec la distributivité'},
  'collect-like-terms':{title:'Réduire les termes semblables'},
  'integer-arithmetic':{title:'Calculer avec les entiers relatifs'}
});

const CATEGORY_SKILLS=Object.freeze({
  develop:['distributivity','integer-arithmetic'],
  'develop-reduce':['distributivity','collect-like-terms','integer-arithmetic'],
  reduce:['collect-like-terms','integer-arithmetic'],
  mixed:Object.keys(SKILLS)
});

function xTerm(a){
  if(a===0)return '';
  if(a===1)return 'x';
  if(a===-1)return '-x';
  return `${a}x`;
}
function signed(n){return n<0?`${n}`:`+${n}`;}
function linear(a,b){
  if(a===0)return `${b}`;
  return `${xTerm(a)}${b===0?'':signed(b)}`;
}
function factor(a){return a===1?'':a===-1?'-':`${a}`;}
function binomial(h){return h===0?'x':`x${signed(h)}`;}
function clean(s){return s.replace(/\+\-/g,'-').replace(/\s+/g,'');}
function ex(category,seed,promptLatex,expectedLatex,correctionLatex){
  return {id:`calcul-litteral:${category}:${seed}`,category,seed,promptLatex,expectedLatex,correctionLatex,correctionRelations:correctionLatex.map(()=> 'equals')};
}

function develop(seed){
  const r=new RNG(seed),a=r.nonZero(-7,7),h=r.nonZero(-9,9);
  const expected=linear(a,a*h);
  return ex('develop',seed,`${factor(a)}(${binomial(h)})`,expected,[expected]);
}

function developReduce(seed){
  const r=new RNG(seed),a=r.nonZero(-6,6),h=r.nonZero(-8,8),k=r.nonZero(-9,9);
  let b=r.nonZero(-6,6);while(a+b===0)b=r.nonZero(-6,6);
  const expanded=clean(`${xTerm(a)}${signed(a*h)}${b>0?'+':''}${xTerm(b)}${signed(k)}`);
  const expected=linear(a+b,a*h+k);
  const prompt=clean(`${factor(a)}(${binomial(h)})${b>0?'+':''}${xTerm(b)}${signed(k)}`);
  return ex('develop-reduce',seed,prompt,expected,[expanded,expected]);
}

function reduce(seed){
  const r=new RNG(seed),a=r.nonZero(-8,8),c=r.nonZero(-8,8),b=r.nonZero(-12,12),d=r.nonZero(-12,12);
  const prompt=clean(`${xTerm(a)}${signed(b)}${c>0?'+':''}${xTerm(c)}${signed(d)}`);
  const expected=linear(a+c,b+d);
  return ex('reduce',seed,prompt,expected,[expected]);
}

function generateExercise(category,seed){
  if(category==='mixed'){
    const chosen=new RNG(seed).pick(BASE);
    const inner=generateExercise(chosen,(seed^0x7f4a7c15)>>>0);
    return {...inner,id:`calcul-litteral:mixed:${seed}`,category:'mixed',sourceCategory:chosen,seed};
  }
  return ({develop,'develop-reduce':developReduce,reduce})[category](seed);
}

export const CALCUL_LITTERAL_3EME_PACK=defineTrainerPack({
  id:'calcul-litteral-3eme',
  version:1,
  locale:'fr-FR',
  level:'3eme',
  title:'Calcul littéral',
  categories:CATEGORIES,
  categoryInfo:CATEGORY_INFO,
  workspace:WORKSPACE,
  keyboard:Object.freeze({
    profile:'calcul-litteral-3eme',
    mobileMode:'full',
    desktopMode:'compact'
  }),
  skills:SKILLS,
  categorySkills:CATEGORY_SKILLS,
  training:Object.freeze({
    adaptiveMixed:true,
    mixedCategory:'mixed',
    sampleSize:10,
    recentCategoryPenalty:0.18,
    exploration:0.1
  }),
  generateExercise,
  nextSeed:randomSeed,
  validateExercise(exercise,rows){
    return validateEqualityChain(exercise.promptLatex,rows.map(row=>row.value),exercise.expectedLatex);
  },
  pedagogy:Object.freeze({
    domainAnalysis:false,
    allowedTechniques:Object.freeze(['distributivity','collect-like-terms','integer-arithmetic']),
    forbiddenTechniques:Object.freeze(['equation-solving','discriminant','quadratic-formula'])
  })
});

export default CALCUL_LITTERAL_3EME_PACK;
