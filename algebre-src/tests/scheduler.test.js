import { describe, expect, test } from 'vitest';
import { createEmptyProgress, recordCompletion } from '../src/trainer/progress.js';
import { selectNextExercise } from '../src/trainer/scheduler.js';

function schedulerPack({adaptive=false}={}){
  return {
    id:'scheduler-test',
    categories:['fresh','due','simple','mixed'],
    categoryInfo:{
      fresh:{difficulty:2},
      due:{difficulty:2},
      simple:{difficulty:1},
      mixed:{difficulty:2}
    },
    skills:{
      fresh:{title:'Fresh',prerequisites:[]},
      due:{title:'Due',prerequisites:[]},
      simple:{title:'Simple',prerequisites:[]}
    },
    categorySkills:{
      fresh:['fresh'],
      due:['due'],
      simple:['simple'],
      mixed:['fresh','due']
    },
    training:{
      adaptiveMixed:adaptive,
      mixedCategory:'mixed',
      sampleSize:2,
      historySize:8,
      recentCategoryPenalty:.1,
      exploration:0
    },
    nextSeed:()=>1,
    generateExercise(category,seed){
      let sourceCategory=category;
      if(category==='mixed')sourceCategory=seed%2===0?'fresh':'due';
      return {category,sourceCategory,seed,promptLatex:`${sourceCategory}-${seed}`};
    }
  };
}

function prerequisitePack(){
  return {
    id:'prerequisite-test',
    categories:['base','advanced','mixed'],
    categoryInfo:{base:{difficulty:1},advanced:{difficulty:3},mixed:{difficulty:2}},
    skills:{
      base:{title:'Base',prerequisites:[]},
      advanced:{title:'Advanced',prerequisites:['base']}
    },
    categorySkills:{base:['base'],advanced:['advanced'],mixed:['base','advanced']},
    training:{adaptiveMixed:true,mixedCategory:'mixed',sampleSize:2,historySize:0,recentCategoryPenalty:0,exploration:0},
    nextSeed:()=>1,
    generateExercise(category,seed){
      const sourceCategory=category==='mixed'?(seed%2===0?'advanced':'base'):category;
      return {category,sourceCategory,seed,promptLatex:`${sourceCategory}-${seed}`};
    }
  };
}

describe('adaptive exercise scheduler',()=>{
  test('avoids an exercise completed in a previous session when alternatives exist',()=>{
    const pack=schedulerPack();
    const oldExercise=pack.generateExercise('simple',11);
    const progress=recordCompletion(pack,createEmptyProgress(pack),oldExercise,{},new Date('2026-08-25T12:00:00Z'));
    const seeds=[11,12];
    const choice=selectNextExercise(pack,'simple',progress,{
      sampleSize:2,
      nextSeed:()=>seeds.shift()
    });
    expect(choice.seed).toBe(12);
    expect(choice.promptLatex).toBe('simple-12');
  });

  test('adaptive mixed mode prefers a candidate targeting an unseen skill',()=>{
    const pack=schedulerPack({adaptive:true});
    const progress={
      version:1,
      completed:8,
      skills:{
        fresh:{attempts:8,mastery:.95,streak:8,mistakes:0,totalDurationMs:8000,lastSeen:'2026-08-25T12:00:00.000Z'},
        due:{attempts:0,mastery:0,streak:0,mistakes:0,totalDurationMs:0,lastSeen:null},
        simple:{attempts:0,mastery:0,streak:0,mistakes:0,totalDurationMs:0,lastSeen:null}
      },
      categories:{},
      recentExercises:[]
    };
    const seeds=[2,3];
    const choice=selectNextExercise(pack,'mixed',progress,{
      nextSeed:()=>seeds.shift(),
      now:new Date('2026-08-25T12:00:00Z')
    });
    expect(choice.sourceCategory).toBe('due');
    expect(choice.seed).toBe(3);
  });

  test('spaced review brings a mastered but overdue skill back before an equally mastered fresh skill',()=>{
    const pack=schedulerPack({adaptive:true});
    const progress={
      version:1,
      completed:20,
      skills:{
        fresh:{attempts:10,mastery:.95,streak:4,mistakes:0,totalDurationMs:10000,lastSeen:'2026-08-25T11:00:00.000Z'},
        due:{attempts:10,mastery:.95,streak:4,mistakes:0,totalDurationMs:10000,lastSeen:'2026-06-01T12:00:00.000Z'},
        simple:{attempts:0,mastery:0,streak:0,mistakes:0,totalDurationMs:0,lastSeen:null}
      },
      categories:{},
      recentExercises:[]
    };
    const seeds=[2,3];
    const choice=selectNextExercise(pack,'mixed',progress,{
      nextSeed:()=>seeds.shift(),
      now:new Date('2026-08-25T12:00:00Z')
    });
    expect(choice.sourceCategory).toBe('due');
    expect(choice.score).toBeGreaterThan(0);
  });

  test('unseen advanced skills wait until their prerequisites have evidence',()=>{
    const pack=prerequisitePack();
    const empty=createEmptyProgress(pack);
    let seeds=[2,3];
    const before=selectNextExercise(pack,'mixed',empty,{nextSeed:()=>seeds.shift(),now:new Date('2026-08-25T12:00:00Z')});
    expect(before.sourceCategory).toBe('base');

    const ready={
      version:1,
      completed:10,
      skills:{
        base:{attempts:10,mastery:.98,streak:5,mistakes:0,totalDurationMs:10000,lastSeen:'2026-08-25T11:00:00.000Z'},
        advanced:{attempts:0,mastery:0,streak:0,mistakes:0,totalDurationMs:0,lastSeen:null}
      },
      categories:{},
      recentExercises:[]
    };
    seeds=[2,3];
    const after=selectNextExercise(pack,'mixed',ready,{nextSeed:()=>seeds.shift(),now:new Date('2026-08-25T12:00:00Z')});
    expect(after.sourceCategory).toBe('advanced');
  });

  test('session recency and persistent history can be combined safely',()=>{
    const pack=schedulerPack();
    const progress=createEmptyProgress(pack);
    const seeds=[40,41,42];
    const first=pack.generateExercise('simple',40);
    const choice=selectNextExercise(pack,'simple',progress,{
      sampleSize:3,
      recent:[{seed:40,sourceCategory:'simple',promptLatex:first.promptLatex}],
      nextSeed:()=>seeds.shift()
    });
    expect(choice.seed).toBe(41);
  });
});
