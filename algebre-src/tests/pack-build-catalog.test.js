import { describe, expect, test } from 'vitest';
import { PACK_BUILD_IDS, getPackBuildConfig, packBasePath, validatePackBuildCatalog } from '../src/packs/catalog.js';
import { TRAINER_PACKS } from '../src/packs/index.js';

describe('trainer PWA build catalog',()=>{
  test('every runtime pack has one independent build definition',()=>{
    expect(validatePackBuildCatalog()).toBe(true);
    expect([...PACK_BUILD_IDS].sort()).toEqual(Object.keys(TRAINER_PACKS).sort());
  });

  test('pack routes and install identities are distinct',()=>{
    const bases=PACK_BUILD_IDS.map(id=>packBasePath(getPackBuildConfig(id)));
    expect(new Set(bases).size).toBe(bases.length);
    expect(bases).toContain('/mini-anki-fractions-puissances/algebre/');
    expect(bases).toContain('/mini-anki-fractions-puissances/calcul-litteral/');
  });

  test('every build definition points to the matching runtime pack',async()=>{
    for(const id of PACK_BUILD_IDS){
      const config=getPackBuildConfig(id);
      const moduleUrl=new URL(`../${config.module}`,import.meta.url);
      const imported=await import(moduleUrl.href);
      expect(imported.default.id).toBe(id);
      expect(imported.default).toBe(TRAINER_PACKS[id]);
    }
  });
});
