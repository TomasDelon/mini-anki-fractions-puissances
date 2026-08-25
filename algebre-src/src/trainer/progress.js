import { resolveExerciseDifficulty, resolveExerciseSkills } from './pack.js';

export const PROGRESS_VERSION=1;

const clamp01=value=>Math.max(0,Math.min(1,value));

function finiteNumber(value,fallback=0){
  return Number.isFinite(value)?value:fallback;
}

function emptySkill(){
  return {attempts:0,mastery:0,streak:0,mistakes:0,totalDurationMs:0,lastSeen:null};
}

export function progressStorageKey(pack){
  return `math-trainer-${pack.id}-progress-v${PROGRESS_VERSION}`;
}

export function createEmptyProgress(pack){
  const skills={};
  for(const id of Object.keys(pack.skills||{})) skills[id]=emptySkill();
  return {version:PROGRESS_VERSION,completed:0,skills,categories:{}};
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

export function normalizeProgress(pack,value){
  const empty=createEmptyProgress(pack);
  if(!value||typeof value!=='object') return empty;
  const skills={};
  for(const id of Object.keys(pack.skills||{})) skills[id]=normalizeSkill(value.skills?.[id]);
  const categories={};
  for(const category of pack.categories){
    if(value.categories?.[category]) categories[category]=normalizeCategory(value.categories[category]);
  }
  return {
    version:PROGRESS_VERSION,
    completed:Math.max(0,Math.floor(finiteNumber(value.completed))),
    skills,
    categories
  };
}

export function recordCompletion(pack,progress,exercise,attempt={},now=new Date()){
  const current=normalizeProgress(pack,progress);
  const mistakes=Math.max(0,Math.floor(finiteNumber(attempt.mistakes)));
  const hints=Math.max(0,Math.floor(finiteNumber(attempt.hints)));
  const durationMs=Math.max(0,finiteNumber(attempt.durationMs));
  const quality=qualityFromCompletion({mistakes,hints});
  const difficulty=resolveExerciseDifficulty(pack,exercise);
  const skills=resolveExerciseSkills(pack,exercise);
  const seenAt=(now instanceof Date?now:new Date(now)).toISOString();
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

  return {
    version:PROGRESS_VERSION,
    completed:current.completed+1,
    skills:nextSkills,
    categories
  };
}

export function categoryMastery(pack,progress,category){
  const normalized=normalizeProgress(pack,progress);
  const ids=pack.categorySkills?.[category]||[];
  if(!ids.length) return null;
  const states=ids.map(id=>normalized.skills[id]).filter(Boolean);
  const observed=states.filter(skill=>skill.attempts>0);
  if(!observed.length) return null;
  const mastery=states.reduce((sum,skill)=>sum+(skill.attempts>0?skill.mastery:0),0)/ids.length;
  const attempts=observed.reduce((sum,skill)=>sum+skill.attempts,0);
  return {mastery,attempts,coverage:observed.length/ids.length};
}

export function weakestSkills(pack,progress,limit=3){
  const normalized=normalizeProgress(pack,progress);
  return Object.entries(pack.skills||{})
    .map(([id,definition])=>({id,title:definition.title,...normalized.skills[id]}))
    .sort((a,b)=>{
      const aScore=a.attempts===0?-1:a.mastery;
      const bScore=b.attempts===0?-1:b.mastery;
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
