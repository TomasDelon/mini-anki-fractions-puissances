import { hydrateDerivationRows, serializeDerivationRows } from './core.js';

export function sessionStorageKey(pack){
  return `math-trainer-${pack.id}-session-v${pack.version}`;
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
        const rows=serializeDerivationRows(hydrateDerivationRows(value.rows.slice(0,maxRows),pack.workspace));
        return {category:value.category,seed:value.seed>>>0,rows};
      }catch{}
    }
    return null;
  }

  function save(session){
    try{getStorage()?.setItem(key,JSON.stringify(session));return true;}catch{return false;}
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
