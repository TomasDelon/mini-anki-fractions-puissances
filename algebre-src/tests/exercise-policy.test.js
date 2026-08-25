import { describe, expect, test } from 'vitest';
import { createWorkspace } from '../src/trainer/core.js';
import { resolveExerciseKeyboard, resolveExerciseWorkspace } from '../src/trainer/pack.js';
import { EQUATIONS_3EME_PACK } from '../src/packs/equations3eme.js';

describe('per-exercise interaction policy',()=>{
  test('an individual question can request iff or implication without changing the pack default',()=>{
    const workspace=createWorkspace({
      layout:'relations',
      relationMode:'student',
      allowedRelations:['iff','implies'],
      defaultRelation:'iff'
    });
    const exercise={workspace};
    expect(resolveExerciseWorkspace(EQUATIONS_3EME_PACK,exercise)).toBe(workspace);
    expect(EQUATIONS_3EME_PACK.workspace.allowedRelations).toEqual(['iff']);
  });

  test('an individual question can add relation choices while keeping the normal math keyboard',()=>{
    const keyboard=resolveExerciseKeyboard(EQUATIONS_3EME_PACK,{keyboard:{extraKeys:['relationIff','relationImplies']}});
    expect(keyboard.profile).toBe('equations-3eme');
    expect(keyboard.extraKeys).toEqual(['relationIff','relationImplies']);
    expect(keyboard.mobileMode).toBe('full');
    expect(keyboard.desktopMode).toBe('full');
  });

  test('an individual question can also replace the whole keyboard profile when needed',()=>{
    const keyboard=resolveExerciseKeyboard(EQUATIONS_3EME_PACK,{keyboard:{profile:'derivation-relations',desktopMode:'compact'}});
    expect(keyboard.profile).toBe('derivation-relations');
    expect(keyboard.desktopMode).toBe('compact');
    expect(keyboard.mobileMode).toBe('full');
  });

  test('unknown extra keys are rejected at configuration time',()=>{
    expect(()=>resolveExerciseKeyboard(EQUATIONS_3EME_PACK,{keyboard:{extraKeys:['not-a-real-key']}})).toThrow(/Unknown key/);
  });
});
