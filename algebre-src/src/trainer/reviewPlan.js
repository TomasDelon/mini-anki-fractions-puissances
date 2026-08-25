import { dueSkills, normalizeProgress, skillEffectiveMastery } from './progress.js';
import { selectNextExercise } from './scheduler.js';

function categoryDifficulty(pack,category){
  const value=pack.categoryInfo?.[category]?.difficulty;
  return Number.isFinite(value)?value:3;
}

export function categoriesForSkill(pack,skillId,options={}){
  if(!pack.skills?.[skillId])throw new Error(`Unknown skill ${skillId}`);
  const includeMixed=Boolean(options.includeMixed);
  const mixed=pack.training?.mixedCategory;
  return Object.entries(pack.categorySkills||{})
    .filter(([category,ids])=>ids.includes(skillId)&&(includeMixed||category!==mixed))
    .map(([category,ids])=>({
      category,
      skillCount:ids.length,
      difficulty:categoryDifficulty(pack,category)
    }))
    .sort((a,b)=>a.skillCount-b.skillCount||a.difficulty-b.difficulty||a.category.localeCompare(b.category));
}

export function buildReviewPlan(pack,progress,options={}){
  const normalized=normalizeProgress(pack,progress);
  const now=options.now??new Date();
  const includeUnseen=options.includeUnseen!==false;
  const includeBlocked=Boolean(options.includeBlocked);
  const minimumReadiness=Number.isFinite(options.minimumReadiness)?Math.max(0,Math.min(1,options.minimumReadiness)):.35;
  const limit=Number.isFinite(options.limit)?Math.max(0,Math.floor(options.limit)):Object.keys(pack.skills||{}).length;

  return dueSkills(pack,normalized,now)
    .filter(state=>includeUnseen||state.attempts>0)
    .filter(state=>includeBlocked||state.readiness>=minimumReadiness)
    .map(state=>{
      const categories=categoriesForSkill(pack,state.skillId);
      const fallback=pack.training?.mixedCategory&&pack.categories.includes(pack.training.mixedCategory)?pack.training.mixedCategory:null;
      const category=categories[0]?.category||fallback;
      return Object.freeze({
        ...state,
        title:pack.skills[state.skillId].title,
        category,
        alternatives:Object.freeze(categories.map(item=>item.category)),
        effectiveMastery:skillEffectiveMastery(normalized.skills[state.skillId])
      });
    })
    .filter(item=>item.category)
    .slice(0,limit);
}

export function selectReviewExercise(pack,progress,options={}){
  const plan=buildReviewPlan(pack,progress,options);
  if(!plan.length)return null;
  const target=plan[0];
  const sampleSize=Number.isFinite(options.sampleSize)
    ?Math.max(1,Math.floor(options.sampleSize))
    :Math.max(6,Math.min(16,pack.training?.sampleSize||8));
  const choice=selectNextExercise(pack,target.category,progress,{
    recent:options.recent,
    historySize:options.historySize,
    currentPrompt:options.currentPrompt,
    nextSeed:options.nextSeed,
    now:options.now,
    sampleSize
  });
  return Object.freeze({...choice,targetSkill:target.skillId,review:target});
}
