import { resolveExerciseDifficulty, resolveExerciseSkills } from './pack.js';

export const PROGRESS_VERSION=1;
export const RECENT_EXERCISE_LIMIT=24;
const HOUR_MS=60*60*1000;

const clamp01=value=>Math.max(0,Math.min(1,value));

function finiteNumber(value,fallback=0){
  return Number.isFinite(value)?value:fallback;
}

function emptySkill(){
  return {attempts:0,mastery:0,streak:0,mistakes:0,totalDurationMs:0,lastSeen:null};
}

function timestamp(value){
  if(value instanceof Date)return Number.isFinite(value.getTime())?value.getTime():Date.now();
  if(Number.isFinite(value))return value;
  const parsed=typeof value==='string'?Date.parse(value):NaN;
  return Number.isFinite(parsed)?parsed:Date.now();
}

export function progressStorageKey(pack){
  return `math-trainer-${pack.id}-progress-v${PROGRESS_VERSION}`;
}

export function createEmptyProgress(pack){
  const skills={};
  for(const id of Object.keys(pack.skills||{})) skills[id]=emptySkill();
  return {version:PROGRESS_VERSION,completed:0,skills,categories:{},recentExercises:[]};
}

export function qualityFromCompletion({mistakes=0,hints=0}={}){
  const penalty=Math.min(4,Math.max(0,mistakes))*0.14+Math.min(3,Math.max(0,hints))*0.1;
  return Math.max(0.3,clamp01(1-penalty));
}

function normalizeSkill(value){
  if(!value||typeof value!=='object') return emptySkill();
  return {
    attempts:Math.max(0,Math.floor(finiteNumber(value.attempts))),
    mastery:clamp01(finiteNumber(value.mastery)),
    streak:Math.max(0,Math.floor(finiteNumber(value.streak))),
    mistakes:Math.max(0,Math.floor(finiteNumber(value.mistakes))),
    totalDurationMs:Math.max(0,finiteNumber(value.totalDurationMs)),
    lastSeen:typeof value.lastSeen==='string'?value.lastSeen:null
  };
}

function normalizeCategory(value){
  if(!value||typeof value!=='object') return {completed:0,mistakes:0,totalDurationMs:0,lastSeen:null};
  return {
    completed:Math.max(0,Math.floor(finiteNumber(value.completed))),
    mistakes:Math.max(0,Math.floor(finiteNumber(value.mistakes))),
    totalDurationMs:Math.max(0,finiteNumber(value.totalDurationMs)),
    lastSeen:typeof value.lastSeen==='string'?value.lastSeen:null
  };
}

function normalizeRecentExercise(pack,value){
  if(!value||typeof value!=='object')return null;
  const sourceCategory=typeof value.sourceCategory==='string'&&pack.categories.includes(value.sourceCategory)?value.sourceCategory:null;
  if(!sourceCategory||typeof value.promptLatex!=='string'||!value.promptLatex.trim())return null;
  const skills=Array.isArray(value.skills)?[...new Set(value.skills.filter(id=>pack.skills[id]))]:[];
  return {
    seed:Number.isFinite(value.seed)?value.seed>>>0:null,
    sourceCategory,
    promptLatex:value.promptLatex,
    skills,
    mistakes:Math.max(0,Math.floor(finiteNumber(value.mistakes))),
    hints:Math.max(0,Math.floor(finiteNumber(value.hints))),
    durationMs:Math.max(0,finiteNumber(value.durationMs)),
    completedAt:typeof value.completedAt==='string'?value.completedAt:null
  };
}

export function normalizeProgress(pack,value){
  const empty=createEmptyProgress(pack);
  if(!value||typeof value!=='object') return empty;
  const skills={};
  for(const id of Object.keys(pack.skills||{})) skills[id]=normalizeSkill(value.skills?.[id]);
  const categories={};
  for(const category of pack.categories){
    if(value.categories?.[category]) categories[category]=normalizeCategory(value.categories[category]);
  }
  const recentExercises=(Array.isArray(value.recentExercises)?value.recentExercises:[])
    .map(item=>normalizeRecentExercise(pack,item))
    .filter(Boolean)
    .slice(-RECENT_EXERCISE_LIMIT);
  return {
    version:PROGRESS_VERSION,
    completed:Math.max(0,Math.floor(finiteNumber(value.completed))),
    skills,
    categories,
    recentExercises
  };
}

export function skillConfidence(skill){
  const state=normalizeSkill(skill);
  return state.attempts===0?0:1-Math.exp(-state.attempts/3);
}

export function skillEffectiveMastery(skill){
  const state=normalizeSkill(skill);
  return state.mastery*skillConfidence(state);
}

function readinessFromNormalized(pack,progress,skillId){
  const definition=pack.skills?.[skillId];
  if(!definition)throw new Error(`Unknown skill ${skillId}`);
  const prerequisites=definition.prerequisites||[];
  if(!prerequisites.length)return 1;
  const prerequisiteMastery=Math.min(...prerequisites.map(id=>skillEffectiveMastery(progress.skills[id])));
  return .2+.8*prerequisiteMastery;
}

export function skillReadiness(pack,progress,skillId){
  return readinessFromNormalized(pack,normalizeProgress(pack,progress),skillId);
}

export function exerciseReadiness(pack,progress,exercise){
  const normalized=normalizeProgress(pack,progress);
  const ids=resolveExerciseSkills(pack,exercise);
  if(!ids.length)return 1;
  return Math.min(...ids.map(id=>readinessFromNormalized(pack,normalized,id)));
}

export function skillReviewIntervalMs(skill){
  const state=normalizeSkill(skill);
  if(state.attempts===0)return 0;
  const streakFactor=2**Math.min(5,state.streak);
  const masteryFactor=.75+2.25*state.mastery;
  const hours=Math.min(30*24,8*streakFactor*masteryFactor);
  return Math.max(4*HOUR_MS,hours*HOUR_MS);
}

export function skillReviewUrgency(skill,now=new Date()){
  const state=normalizeSkill(skill);
  if(state.attempts===0)return 1.25;

  const weakness=1-skillEffectiveMastery(state);
  const interval=skillReviewIntervalMs(state);
  const seenAt=state.lastSeen?Date.parse(state.lastSeen):NaN;
  const age=Number.isFinite(seenAt)?Math.max(0,timestamp(now)-seenAt):interval;
  const dueRatio=interval>0?Math.min(2,age/interval):1;
  const overdue=Math.min(1.5,dueRatio);
  return Math.min(1.5,Math.max(0,weakness*.72+overdue*.38));
}

export function skillReviewState(pack,progress,skillId,now=new Date()){
  if(!pack.skills?.[skillId])throw new Error(`Unknown skill ${skillId}`);
  const normalized=normalizeProgress(pack,progress);
  const skill=normalized.skills[skillId];
  const intervalMs=skillReviewIntervalMs(skill);
  const seenAt=skill.lastSeen?Date.parse(skill.lastSeen):NaN;
  const nextReviewAt=skill.attempts>0&&Number.isFinite(seenAt)?new Date(seenAt+intervalMs).toISOString():null;
  return Object.freeze({
    skillId,
    attempts:skill.attempts,
    mastery:skill.mastery,
    effectiveMastery:skillEffectiveMastery(skill),
    readiness:readinessFromNormalized(pack,normalized,skillId),
    streak:skill.streak,
    intervalMs,
    urgency:skillReviewUrgency(skill,now),
    lastSeen:skill.lastSeen,
    nextReviewAt,
    due:skill.attempts===0||!nextReviewAt||timestamp(now)>=Date.parse(nextReviewAt)
  });
}

export function exerciseReviewUrgency(pack,progress,exercise,now=new Date()){
  const normalized=normalizeProgress(pack,progress);
  const ids=resolveExerciseSkills(pack,exercise);
  if(!ids.length)return 0;
  const urgencies=ids.map(id=>skillReviewUrgency(normalized.skills[id],now));
  const average=urgencies.reduce((sum,value)=>sum+value,0)/urgencies.length;
  const peak=Math.max(...urgencies);
  return peak*.62+average*.38;
}

export function dueSkills(pack,progress,now=new Date(),limit=Infinity){
  const normalized=normalizeProgress(pack,progress);
  return Object.keys(pack.skills||{})
    .map(id=>skillReviewState(pack,normalized,id,now))
    .filter(state=>state.due)
    .sort((a,b)=>b.urgency-a.urgency||b.readiness-a.readiness||a.attempts-b.attempts||a.skillId.localeCompare(b.skillId))
    .slice(0,Math.max(0,Number.isFinite(limit)?Math.floor(limit):Object.keys(pack.skills||{}).length));
}

export function recordCompletion(pack,progress,exercise,attempt={},now=new Date()){
  const current=normalizeProgress(pack,progress);
  const mistakes=Math.max(0,Math.floor(finiteNumber(attempt.mistakes)));
  const hints=Math.max(0,Math.floor(finiteNumber(attempt.hints)));
  const durationMs=Math.max(0,finiteNumber(attempt.durationMs));
  const quality=qualityFromCompletion({mistakes,hints});
  const difficulty=resolveExerciseDifficulty(pack,exercise);
  const skills=resolveExerciseSkills(pack,exercise);
  const nowDate=now instanceof Date?now:new Date(now);
  const seenAt=nowDate.toISOString();
  const nextSkills={...current.skills};

  for(const id of skills){
    const previous=normalizeSkill(current.skills[id]);
    const alpha=previous.attempts<2?0.5:0.28;
    const difficultyWeight=0.9+difficulty*0.03;
    const signal=clamp01(quality*difficultyWeight);
    nextSkills[id]={
      attempts:previous.attempts+1,
      mastery:previous.attempts===0?signal:clamp01(previous.mastery*(1-alpha)+signal*alpha),
      streak:mistakes===0?previous.streak+1:0,
      mistakes:previous.mistakes+mistakes,
      totalDurationMs:previous.totalDurationMs+durationMs,
      lastSeen:seenAt
    };
  }

  const category=exercise.sourceCategory||exercise.category;
  const previousCategory=normalizeCategory(current.categories[category]);
  const categories={...current.categories,[category]:{
    completed:previousCategory.completed+1,
    mistakes:previousCategory.mistakes+mistakes,
    totalDurationMs:previousCategory.totalDurationMs+durationMs,
    lastSeen:seenAt
  }};
  const recentEntry={
    seed:Number.isFinite(exercise.seed)?exercise.seed>>>0:null,
    sourceCategory:category,
    promptLatex:exercise.promptLatex,
    skills:[...skills],
    mistakes,
    hints,
    durationMs,
    completedAt:seenAt
  };
  const recentExercises=[...current.recentExercises,recentEntry].slice(-RECENT_EXERCISE_LIMIT);

  return {
    version:PROGRESS_VERSION,
    completed:current.completed+1,
    skills:nextSkills,
    categories,
    recentExercises
  };
}

export function categoryMastery(pack,progress,category){
  const normalized=normalizeProgress(pack,progress);
  const ids=pack.categorySkills?.[category]||[];
  if(!ids.length) return null;
  const states=ids.map(id=>normalized.skills[id]).filter(Boolean);
  const observed=states.filter(skill=>skill.attempts>0);
  if(!observed.length) return null;
  const rawMastery=states.reduce((sum,skill)=>sum+(skill.attempts>0?skill.mastery:0),0)/ids.length;
  const mastery=states.reduce((sum,skill)=>sum+skillEffectiveMastery(skill),0)/ids.length;
  const attempts=observed.reduce((sum,skill)=>sum+skill.attempts,0);
  return {mastery,rawMastery,attempts,coverage:observed.length/ids.length};
}

export function weakestSkills(pack,progress,limit=3){
  const normalized=normalizeProgress(pack,progress);
  return Object.entries(pack.skills||{})
    .map(([id,definition])=>({id,title:definition.title,...normalized.skills[id]}))
    .sort((a,b)=>{
      const aScore=a.attempts===0?-1:skillEffectiveMastery(a);
      const bScore=b.attempts===0?-1:skillEffectiveMastery(b);
      return aScore-bScore||a.attempts-b.attempts||a.id.localeCompare(b.id);
    })
    .slice(0,Math.max(0,limit));
}

export function createProgressStore(pack,options={}){
  const key=progressStorageKey(pack);
  const getStorage=()=>options.storage||globalThis.localStorage;

  function load(){
    try{
      const storage=getStorage();
      if(!storage) return createEmptyProgress(pack);
      const raw=storage.getItem(key);
      if(!raw) return createEmptyProgress(pack);
      return normalizeProgress(pack,JSON.parse(raw));
    }catch{
      return createEmptyProgress(pack);
    }
  }

  function save(progress){
    try{
      getStorage()?.setItem(key,JSON.stringify(normalizeProgress(pack,progress)));
      return true;
    }catch{
      return false;
    }
  }

  function complete(exercise,attempt={}){
    const next=recordCompletion(pack,load(),exercise,attempt,options.now?options.now():new Date());
    save(next);
    return next;
  }

  function clear(){
    try{getStorage()?.removeItem(key);return true;}catch{return false;}
  }

  return Object.freeze({key,load,save,complete,clear});
}
