import { hydrateDerivationRows, serializeDerivationRows } from './core.js';
import { resolveExerciseWorkspace } from './pack.js';

export function sessionStorageKey(pack){
  return `math-trainer-${pack.id}-session-v${pack.version}`;
}

function normalizeAttempt(value){
  if(!value||typeof value!=='object')return null;
  const mistakes=Number.isFinite(value.mistakes)?Math.max(0,Math.floor(value.mistakes)):0;
  const hintCount=Number.isFinite(value.hintCount)?Math.max(0,Math.floor(value.hintCount)):0;
  const elapsedMs=Number.isFinite(value.elapsedMs)?Math.max(0,Math.floor(value.elapsedMs)):0;
  return {
    mistakes,
    hintCount,
    fullCorrectionUsed:Boolean(value.fullCorrectionUsed),
    elapsedMs
  };
}

export function createSessionStore(pack,options={}){
  const maxRows=options.maxRows??20;
  const legacyKeys=Object.freeze([...(options.legacyKeys||[])]);
  const key=sessionStorageKey(pack);
  const getStorage=()=>options.storage||globalThis.localStorage;

  function load(){
    let storage;
    try{storage=getStorage();}catch{return null;}
    if(!storage)return null;
    for(const candidate of [key,...legacyKeys]){
      try{
        const raw=storage.getItem(candidate);if(!raw)continue;
        const value=JSON.parse(raw);
        if(!value||!pack.categories.includes(value.category)||!Number.isFinite(value.seed)||!Array.isArray(value.rows)||!value.rows.length)continue;
        const seed=value.seed>>>0;
        const exercise=pack.generateExercise(value.category,seed);
        const workspace=resolveExerciseWorkspace(pack,exercise);
        const rows=serializeDerivationRows(hydrateDerivationRows(value.rows.slice(0,maxRows),workspace));
        const attempt=normalizeAttempt(value.attempt);
        return attempt?{category:value.category,seed,rows,attempt}:{category:value.category,seed,rows};
      }catch{}
    }
    return null;
  }

  function save(session){
    try{
      const attempt=normalizeAttempt(session?.attempt);
      const value=attempt?{...session,attempt}:{...session};
      if(!attempt)delete value.attempt;
      getStorage()?.setItem(key,JSON.stringify(value));
      return true;
    }catch{return false;}
  }

  function clear(){
    let ok=true;
    for(const candidate of [key,...legacyKeys]){
      try{getStorage()?.removeItem(candidate);}catch{ok=false;}
    }
    return ok;
  }

  return Object.freeze({key,legacyKeys,maxRows,load,save,clear});
}
