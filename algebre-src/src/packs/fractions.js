import { Rational } from '../math.js';
import { RNG, randomSeed } from '../exercises.js';
import { createWorkspace } from '../trainer/core.js';
import { defineTrainerPack } from '../trainer/pack.js';
import { validateRationalChain } from '../trainer/rationalMath.js';

const CATEGORY_INFO=Object.freeze({
  simplify:{title:'Simplifier une fraction',formula:'\\dfrac{a}{b}',difficulty:1},
  'same-denominator':{title:'Même dénominateur',formula:'\\dfrac{a}{q}\\pm\\dfrac{b}{q}',difficulty:1},
  'add-subtract':{title:'Addition et soustraction',formula:'\\dfrac{a}{b}\\pm\\dfrac{c}{d}',difficulty:2},
  multiply:{title:'Multiplication',formula:'\\dfrac{a}{b}\\times\\dfrac{c}{d}',difficulty:2},
  divide:{title:'Division',formula:'\\dfrac{a}{b}\\div\\dfrac{c}{d}',difficulty:3},
  mixed:{title:'Mélange',formula:'\\text{toutes les opérations}',difficulty:2}
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
  'simplify-fraction':{
    title:'Simplifier une fraction',
    hint:'Cherche un diviseur commun au numérateur et au dénominateur.'
  },
  'same-denominator-addition':{
    title:'Additionner ou soustraire à même dénominateur',
    hint:'Quand les dénominateurs sont identiques, conserve le dénominateur et calcule les numérateurs.'
  },
  'common-denominator':{
    title:'Trouver un dénominateur commun',
    prerequisites:['same-denominator-addition'],
    hint:'Transforme les deux fractions pour obtenir un même dénominateur.'
  },
  'multiply-fractions':{
    title:'Multiplier des fractions',
    hint:'Multiplie les numérateurs entre eux et les dénominateurs entre eux.'
  },
  'divide-fractions':{
    title:'Diviser des fractions',
    prerequisites:['multiply-fractions'],
    hint:'Remplace la division par une multiplication par l’inverse de la deuxième fraction.'
  }
});

const CATEGORY_SKILLS=Object.freeze({
  simplify:['simplify-fraction'],
  'same-denominator':['same-denominator-addition','simplify-fraction'],
  'add-subtract':['common-denominator','same-denominator-addition','simplify-fraction'],
  multiply:['multiply-fractions','simplify-fraction'],
  divide:['divide-fractions','multiply-fractions','simplify-fraction'],
  mixed:Object.keys(SKILLS)
});

function absBig(value){return value<0n?-value:value;}
function gcd(a,b){a=absBig(BigInt(a));b=absBig(BigInt(b));while(b)[a,b]=[b,a%b];return Number(a||1n);}
function lcm(a,b){return Math.abs(a/gcd(a,b)*b);}
function fraction(n,d){
  if(d<0){n=-n;d=-d;}
  if(n<0)return `-\\frac{${Math.abs(n)}}{${d}}`;
  return `\\frac{${n}}{${d}}`;
}
function rational(n,d=1){return new Rational(BigInt(n),BigInt(d));}
function operator(sign){return sign>0?'+':'-';}
function uniqueLines(lines){
  const out=[];
  for(const line of lines){
    if(typeof line==='string'&&line.trim()&&out.at(-1)!==line)out.push(line);
  }
  return out;
}
function makeExercise(category,seed,promptLatex,expected,correctionLatex){
  const lines=uniqueLines(correctionLatex);
  return Object.freeze({
    id:`fractions:${category}:${seed}`,
    category,
    seed:seed>>>0,
    promptLatex,
    expectedLatex:expected.toLatex(),
    correctionLatex:Object.freeze(lines),
    correctionRelations:Object.freeze(lines.map(()=> 'equals'))
  });
}

function coprimeFraction(r,minDen=2,maxDen=12){
  const d=r.int(minDen,maxDen);
  let n=r.int(1,d-1);
  while(gcd(n,d)!==1)n=r.int(1,d-1);
  return {n,d};
}

function simplify(seed){
  const r=new RNG(seed),base=coprimeFraction(r,3,12),factor=r.int(2,7);
  const n=base.n*factor,d=base.d*factor,expected=rational(base.n,base.d);
  return makeExercise('simplify',seed,fraction(n,d),expected,[expected.toLatex()]);
}

function sameDenominator(seed){
  const r=new RNG(seed),d=r.int(3,12),a=r.int(1,d-1),b=r.int(1,d-1),sign=r.pick([1,-1]);
  const numerator=a+sign*b,expected=rational(numerator,d);
  const combined=fraction(numerator,d);
  return makeExercise('same-denominator',seed,`${fraction(a,d)}${operator(sign)}${fraction(b,d)}`,expected,[combined,expected.toLatex()]);
}

function addSubtract(seed){
  const r=new RNG(seed);
  let left=coprimeFraction(r,2,10),right=coprimeFraction(r,2,10);
  while(left.d===right.d)right=coprimeFraction(r,2,10);
  const sign=r.pick([1,-1]),common=lcm(left.d,right.d);
  const leftN=left.n*(common/left.d),rightN=right.n*(common/right.d);
  const numerator=leftN+sign*rightN;
  const expected=rational(numerator,common);
  const commonLine=`${fraction(leftN,common)}${operator(sign)}${fraction(rightN,common)}`;
  const combined=fraction(numerator,common);
  return makeExercise('add-subtract',seed,`${fraction(left.n,left.d)}${operator(sign)}${fraction(right.n,right.d)}`,expected,[commonLine,combined,expected.toLatex()]);
}

function multiply(seed){
  const r=new RNG(seed),left=coprimeFraction(r,2,12),right=coprimeFraction(r,2,12);
  const numerator=left.n*right.n,denominator=left.d*right.d,expected=rational(numerator,denominator);
  return makeExercise('multiply',seed,`${fraction(left.n,left.d)}\\times${fraction(right.n,right.d)}`,expected,[fraction(numerator,denominator),expected.toLatex()]);
}

function divide(seed){
  const r=new RNG(seed),left=coprimeFraction(r,2,12),right=coprimeFraction(r,2,12);
  const numerator=left.n*right.d,denominator=left.d*right.n,expected=rational(numerator,denominator);
  const reciprocal=`${fraction(left.n,left.d)}\\times${fraction(right.d,right.n)}`;
  return makeExercise('divide',seed,`${fraction(left.n,left.d)}\\div${fraction(right.n,right.d)}`,expected,[reciprocal,fraction(numerator,denominator),expected.toLatex()]);
}

function generateExercise(category,seed){
  const normalized=seed>>>0;
  if(category==='mixed'){
    const chosen=new RNG(normalized).pick(BASE);
    const inner=generateExercise(chosen,(normalized^0x51ed270b)>>>0);
    return Object.freeze({...inner,id:`fractions:mixed:${normalized}`,category:'mixed',sourceCategory:chosen,seed:normalized});
  }
  const generator={simplify,'same-denominator':sameDenominator,'add-subtract':addSubtract,multiply,divide}[category];
  if(!generator)throw new Error(`Unknown fractions category: ${category}`);
  return generator(normalized);
}

export const FRACTIONS_PACK=defineTrainerPack({
  id:'fractions',
  version:1,
  locale:'fr-FR',
  level:'college',
  title:'Fractions',
  categories:CATEGORIES,
  categoryInfo:CATEGORY_INFO,
  workspace:WORKSPACE,
  keyboard:Object.freeze({
    profile:'fractions',
    mobileMode:'full',
    desktopMode:'compact'
  }),
  skills:SKILLS,
  categorySkills:CATEGORY_SKILLS,
  training:Object.freeze({
    adaptiveMixed:true,
    mixedCategory:'mixed',
    sampleSize:12,
    historySize:12,
    recentCategoryPenalty:.16,
    exploration:.1
  }),
  generateExercise,
  nextSeed:randomSeed,
  validateExercise(exercise,rows){
    return validateRationalChain(exercise.promptLatex,rows.map(row=>row.value),exercise.expectedLatex);
  },
  pedagogy:Object.freeze({
    domainAnalysis:false,
    allowedTechniques:Object.freeze([
      'fraction-simplification',
      'common-denominator',
      'fraction-addition-subtraction',
      'fraction-multiplication',
      'fraction-division'
    ]),
    forbiddenTechniques:Object.freeze(['decimal-approximation','calculator-only-answer'])
  })
});

export { CATEGORIES as FRACTIONS_CATEGORIES, CATEGORY_INFO as FRACTIONS_CATEGORY_INFO, generateExercise as generateFractionExercise };
export default FRACTIONS_PACK;
