import { describe, expect, test } from 'vitest';
import { EQUATIONS_3EME_PACK } from '../src/packs/equations3eme.js';
import { CALCUL_LITTERAL_3EME_PACK } from '../src/packs/calculLitteral3eme.js';
import { createSessionStore, sessionStorageKey } from '../src/trainer/session.js';

function memoryStorage(){
  const data=new Map();
  return {
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key),
    dump:()=>new Map(data)
  };
}

describe('trainer session store',()=>{
  test('uses a distinct versioned key for each pack',()=>{
    expect(sessionStorageKey(EQUATIONS_3EME_PACK)).not.toBe(sessionStorageKey(CALCUL_LITTERAL_3EME_PACK));
  });

  test('saves and restores row relations as well as math',()=>{
    const storage=memoryStorage();
    const store=createSessionStore(EQUATIONS_3EME_PACK,{storage});
    store.save({category:'linear',seed:42,rows:[{value:'3x=9',relationBefore:'iff'}]});
    expect(store.load()).toEqual({category:'linear',seed:42,rows:[{value:'3x=9',relationBefore:'iff'}]});
  });

  test('persists attempt assistance and mistakes across a reload',()=>{
    const storage=memoryStorage();
    const store=createSessionStore(EQUATIONS_3EME_PACK,{storage});
    store.save({
      category:'simple',
      seed:17,
      rows:[{value:'x+3=9',relationBefore:'iff'}],
      attempt:{mistakes:2,hintCount:3,fullCorrectionUsed:true,startedAt:123456789}
    });
    expect(store.load()).toEqual({
      category:'simple',
      seed:17,
      rows:[{value:'x+3=9',relationBefore:'iff'}],
      attempt:{mistakes:2,hintCount:3,fullCorrectionUsed:true,startedAt:123456789}
    });
  });

  test('normalizes malformed attempt counters instead of trusting stored values',()=>{
    const storage=memoryStorage();
    const store=createSessionStore(EQUATIONS_3EME_PACK,{storage});
    store.save({
      category:'simple',seed:5,rows:[''],
      attempt:{mistakes:-4.2,hintCount:2.9,fullCorrectionUsed:1,startedAt:-10}
    });
    expect(store.load().attempt).toEqual({mistakes:0,hintCount:2,fullCorrectionUsed:true,startedAt:null});
  });

  test('migrates a legacy string-row session safely',()=>{
    const storage=memoryStorage();
    storage.setItem('legacy',JSON.stringify({category:'simple',seed:7,rows:['x=3']}));
    const store=createSessionStore(EQUATIONS_3EME_PACK,{storage,legacyKeys:['legacy']});
    expect(store.load()).toEqual({category:'simple',seed:7,rows:[{value:'x=3',relationBefore:'iff'}]});
  });

  test('does not load another pack category into the active pack',()=>{
    const storage=memoryStorage();
    const equations=createSessionStore(EQUATIONS_3EME_PACK,{storage});
    const calcul=createSessionStore(CALCUL_LITTERAL_3EME_PACK,{storage});
    equations.save({category:'linear',seed:1,rows:[{value:'x=1',relationBefore:'iff'}]});
    expect(calcul.load()).toBeNull();
  });
});
