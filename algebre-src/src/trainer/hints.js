import { resolveExerciseSkills } from './pack.js';

function freezeHint(hint){
  return Object.freeze({...hint});
}

function strategyHint(pack,exercise){
  const skillIds=resolveExerciseSkills(pack,exercise);
  if(!skillIds.length)return null;

  const definitions=skillIds.map(id=>pack.skills[id]).filter(Boolean);
  const explicit=definitions.find(skill=>typeof skill.hint==='string'&&skill.hint.trim());
  if(explicit){
    return freezeHint({
      id:'strategy',
      kind:'text',
      title:'Piste',
      text:explicit.hint.trim()
    });
  }

  const titles=definitions.map(skill=>skill.title).filter(Boolean);
  if(!titles.length)return null;
  return freezeHint({
    id:'strategy',
    kind:'text',
    title:'Piste',
    text:`Pense à : ${titles.join(' · ')}`
  });
}

export function createHintSequence(pack,exercise){
  const hints=[];
  const strategy=strategyHint(pack,exercise);
  if(strategy)hints.push(strategy);

  for(let index=0;index<(exercise?.correctionLatex||[]).length;index++){
    const latex=exercise.correctionLatex[index];
    if(typeof latex!=='string'||!latex.trim())continue;
    hints.push(freezeHint({
      id:`step-${index+1}`,
      kind:'math',
      title:`Étape ${index+1}`,
      latex,
      relation:exercise.correctionRelations?.[index]||null
    }));
  }

  return Object.freeze(hints);
}

export function revealHintCount(sequence,currentCount){
  const length=Array.isArray(sequence)?sequence.length:0;
  return Math.min(length,Math.max(0,Math.floor(currentCount||0))+1);
}

export function visibleHints(sequence,count){
  const length=Math.max(0,Math.floor(count||0));
  return Object.freeze([...(sequence||[])].slice(0,length));
}

export function completionHintCost({revealed=0,fullCorrection=false}={}){
  const progressive=Math.max(0,Math.floor(revealed||0));
  return Math.max(progressive,fullCorrection?2:0);
}
