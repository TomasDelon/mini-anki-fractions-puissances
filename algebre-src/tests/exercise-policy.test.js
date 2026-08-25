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

  test('an individual question can switch to the relation keyboard',()=>{
    const keyboard=resolveExerciseKeyboard(EQUATIONS_3EME_PACK,{keyboard:{profile:'derivation-relations',desktopMode:'compact'}});
    expect(keyboard.profile).toBe('derivation-relations');
    expect(keyboard.desktopMode).toBe('compact');
    expect(keyboard.mobileMode).toBe('full');
  });
});
