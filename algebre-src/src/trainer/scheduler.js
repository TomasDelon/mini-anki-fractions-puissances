import { categoryMastery, normalizeProgress } from './progress.js';

function sourceCategory(exercise){
  return exercise?.sourceCategory||exercise?.category||null;
}

function seededJitter(seed){
  let x=(seed>>>0)^0x9e3779b9;
  x=Math.imul(x^(x>>>16),0x21f0aaad);
  x=Math.imul(x^(x>>>15),0x735a2d97);
  x^=x>>>15;
  return (x>>>0)/0xffffffff;
}

function recentCategoryCount(recent,category){
  return recent.reduce((count,item)=>count+(item?.sourceCategory===category?1:0),0);
}

function candidateScore(pack,progress,exercise,seed,recent){
  const category=sourceCategory(exercise);
  const estimate=categoryMastery(pack,progress,category);
  const need=estimate?1-estimate.mastery:1.08;
  const coverageBonus=estimate?(1-estimate.coverage)*0.2:0.18;
  const repeatPenalty=recentCategoryCount(recent,category)*pack.training.recentCategoryPenalty;
  const exploration=seededJitter(seed)*pack.training.exploration;
  return need+coverageBonus+exploration-repeatPenalty;
}

function isRejected(candidate,seed,recent,currentPrompt){
  if(currentPrompt&&candidate.promptLatex===currentPrompt)return true;
  return recent.some(item=>(item?.seed!==null&&item?.seed!==undefined&&item.seed===seed)||item?.promptLatex===candidate.promptLatex);
}

function combinedRecent(progress,sessionRecent,limit=8){
  const persisted=Array.isArray(progress.recentExercises)?progress.recentExercises.slice(-limit):[];
  const live=Array.isArray(sessionRecent)?sessionRecent:[];
  return [...persisted,...live].slice(-(limit+live.length));
}

export function selectNextExercise(pack,category,progress,options={}){
  const normalizedProgress=normalizeProgress(pack,progress);
  const recent=combinedRecent(normalizedProgress,options.recent,options.historySize??8);
  const currentPrompt=options.currentPrompt||'';
  const nextSeed=options.nextSeed||pack.nextSeed;
  const adaptive=pack.training?.adaptiveMixed&&category===pack.training.mixedCategory;
  const sampleSize=options.sampleSize??(adaptive?pack.training.sampleSize:1);
  let fallback=null,best=null;

  for(let index=0;index<sampleSize;index++){
    const seed=nextSeed()>>>0;
    const exercise=pack.generateExercise(category,seed);
    const entry={seed,exercise,sourceCategory:sourceCategory(exercise),promptLatex:exercise.promptLatex};
    if(!fallback)fallback=entry;
    if(isRejected(exercise,seed,recent,currentPrompt))continue;
    if(!adaptive)return entry;
    const score=candidateScore(pack,normalizedProgress,exercise,seed,recent);
    if(!best||score>best.score)best={...entry,score};
  }

  if(best)return best;
  if(fallback)return fallback;
  const seed=nextSeed()>>>0,exercise=pack.generateExercise(category,seed);
  return {seed,exercise,sourceCategory:sourceCategory(exercise),promptLatex:exercise.promptLatex};
}

export function recentExerciseEntry(seed,exercise){
  return Object.freeze({
    seed:seed>>>0,
    sourceCategory:sourceCategory(exercise),
    promptLatex:exercise?.promptLatex||''
  });
}
