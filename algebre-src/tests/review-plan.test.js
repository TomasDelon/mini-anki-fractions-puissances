import { describe, expect, test } from 'vitest';
import { EQUATIONS_3EME_PACK } from '../src/packs/equations3eme.js';
import { createEmptyProgress, recordCompletion } from '../src/trainer/progress.js';
import { buildReviewPlan, categoriesForSkill, selectReviewExercise } from '../src/trainer/reviewPlan.js';

describe('review plan',()=>{
  test('picks a focused category',()=>{
    const categories=categoriesForSkill(EQUATIONS_3EME_PACK,'equation-isolation');
    expect(categories[0]).toMatchObject({category:'simple',skillCount:1,difficulty:1});
    expect(categories.some(item=>item.category==='mixed')).toBe(false);
  });

  test('can exclude unseen skills',()=>{
    const progress=createEmptyProgress(EQUATIONS_3EME_PACK);
    const plan=buildReviewPlan(EQUATIONS_3EME_PACK,progress,{includeUnseen:false,now:new Date('2026-08-25T12:00:00Z')});
    expect(plan).toEqual([]);
  });

  test('returns overdue learned material',()=>{
    const exercise=EQUATIONS_3EME_PACK.generateExercise('simple',123);
    const progress=recordCompletion(EQUATIONS_3EME_PACK,createEmptyProgress(EQUATIONS_3EME_PACK),exercise,{},new Date('2026-06-01T12:00:00Z'));
    const plan=buildReviewPlan(EQUATIONS_3EME_PACK,progress,{includeUnseen:false,now:new Date('2026-08-25T12:00:00Z')});
    expect(plan[0]).toMatchObject({skillId:'equation-isolation',category:'simple'});
  });

  test('keeps the target skill on the selected exercise',()=>{
    const exercise=EQUATIONS_3EME_PACK.generateExercise('simple',123);
    const progress=recordCompletion(EQUATIONS_3EME_PACK,createEmptyProgress(EQUATIONS_3EME_PACK),exercise,{},new Date('2026-06-01T12:00:00Z'));
    const choice=selectReviewExercise(EQUATIONS_3EME_PACK,progress,{includeUnseen:false,now:new Date('2026-08-25T12:00:00Z'),nextSeed:()=>987654321});
    expect(choice.targetSkill).toBe('equation-isolation');
    expect(choice.review.category).toBe('simple');
    expect(choice.exercise.category).toBe('simple');
  });
});
