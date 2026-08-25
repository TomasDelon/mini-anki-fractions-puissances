import { describe, expect, test } from 'vitest';
import { EQUATIONS_3EME_PACK } from '../src/packs/equations3eme.js';
import { createEmptyProgress, recordCompletion } from '../src/trainer/progress.js';
import { selectNextExercise } from '../src/trainer/scheduler.js';

describe('adaptive exercise scheduler',()=>{
  test('avoids an exercise completed in a previous session when alternatives exist',()=>{
    const oldExercise=EQUATIONS_3EME_PACK.generateExercise('simple',111);
    const progress=recordCompletion(EQUATIONS_3EME_PACK,createEmptyProgress(EQUATIONS_3EME_PACK),oldExercise,{},new Date('2026-08-25T12:00:00Z'));
    const seeds=[111,98765];
    const choice=selectNextExercise(EQUATIONS_3EME_PACK,'simple',progress,{
      sampleSize:2,
      nextSeed:()=>seeds.shift()
    });
    expect(choice.seed).toBe(98765);
    expect(choice.promptLatex).not.toBe(oldExercise.promptLatex);
  });

  test('adaptive mixed mode prefers a candidate targeting an unseen skill',()=>{
    const pack={
      id:'test-pack',
      categories:['known','weak','mixed'],
      categoryInfo:{known:{difficulty:2},weak:{difficulty:2},mixed:{difficulty:2}},
      skills:{known:{title:'Known'},weak:{title:'Weak'}},
      categorySkills:{known:['known'],weak:['weak'],mixed:['known','weak']},
      training:{adaptiveMixed:true,mixedCategory:'mixed',sampleSize:2,recentCategoryPenalty:.1,exploration:0},
      nextSeed:()=>1,
      generateExercise(category,seed){
        const sourceCategory=seed%2===0?'known':'weak';
        return {category,sourceCategory,seed,promptLatex:`${sourceCategory}-${seed}`};
      }
    };
    const progress={
      version:1,
      completed:8,
      skills:{
        known:{attempts:8,mastery:.95,streak:8,mistakes:0,totalDurationMs:8000,lastSeen:'2026-08-25T12:00:00.000Z'},
        weak:{attempts:0,mastery:0,streak:0,mistakes:0,totalDurationMs:0,lastSeen:null}
      },
      categories:{},
      recentExercises:[]
    };
    const seeds=[2,3];
    const choice=selectNextExercise(pack,'mixed',progress,{nextSeed:()=>seeds.shift()});
    expect(choice.sourceCategory).toBe('weak');
    expect(choice.seed).toBe(3);
  });

  test('session recency and persistent history can be combined safely',()=>{
    const progress=createEmptyProgress(EQUATIONS_3EME_PACK);
    const seeds=[40,41,42];
    const first=EQUATIONS_3EME_PACK.generateExercise('linear',40);
    const choice=selectNextExercise(EQUATIONS_3EME_PACK,'linear',progress,{
      sampleSize:3,
      recent:[{seed:40,sourceCategory:'linear',promptLatex:first.promptLatex}],
      nextSeed:()=>seeds.shift()
    });
    expect(choice.seed).not.toBe(40);
  });
});
