import { describe, expect, test } from 'vitest';
import { CALCUL_LITTERAL_3EME_PACK } from '../src/packs/calculLitteral3eme.js';
import { EQUATIONS_3EME_PACK } from '../src/packs/equations3eme.js';
import {
  RECENT_EXERCISE_LIMIT,
  categoryMastery,
  createEmptyProgress,
  createProgressStore,
  dueSkills,
  progressStorageKey,
  recordCompletion,
  skillReviewIntervalMs,
  skillReviewState,
  skillReviewUrgency,
  weakestSkills
} from '../src/trainer/progress.js';

function memoryStorage(){
  const data=new Map();
  return {
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key)
  };
}

describe('generic skill progress',()=>{
  test('records only the skills used by the completed exercise',()=>{
    const exercise=EQUATIONS_3EME_PACK.generateExercise('parentheses',1234);
    const next=recordCompletion(EQUATIONS_3EME_PACK,createEmptyProgress(EQUATIONS_3EME_PACK),exercise,{mistakes:0,durationMs:20000},new Date('2026-08-25T12:00:00Z'));
    expect(next.completed).toBe(1);
    expect(next.skills.distributivity.attempts).toBe(1);
    expect(next.skills['equation-isolation'].attempts).toBe(1);
    expect(next.skills['square-root'].attempts).toBe(0);
    expect(next.categories.parentheses.completed).toBe(1);
    expect(next.recentExercises).toHaveLength(1);
    expect(next.recentExercises[0]).toMatchObject({
      seed:1234,
      sourceCategory:'parentheses',
      promptLatex:exercise.promptLatex,
      mistakes:0,
      hints:0,
      durationMs:20000
    });
  });

  test('mixed exercises credit their actual source category',()=>{
    const exercise=EQUATIONS_3EME_PACK.generateExercise('mixed',987654);
    expect(exercise.sourceCategory).toBeTruthy();
    const next=recordCompletion(EQUATIONS_3EME_PACK,createEmptyProgress(EQUATIONS_3EME_PACK),exercise,{mistakes:1},new Date('2026-08-25T12:00:00Z'));
    expect(next.categories[exercise.sourceCategory].completed).toBe(1);
    expect(next.categories.mixed).toBeUndefined();
    expect(next.recentExercises[0].sourceCategory).toBe(exercise.sourceCategory);
  });

  test('recent exercise history is bounded and keeps the newest work',()=>{
    let progress=createEmptyProgress(EQUATIONS_3EME_PACK);
    for(let seed=1;seed<=RECENT_EXERCISE_LIMIT+6;seed++){
      progress=recordCompletion(EQUATIONS_3EME_PACK,progress,EQUATIONS_3EME_PACK.generateExercise('simple',seed),{},new Date(2026,7,25,12,0,seed));
    }
    expect(progress.recentExercises).toHaveLength(RECENT_EXERCISE_LIMIT);
    expect(progress.recentExercises.at(-1).seed).toBe(RECENT_EXERCISE_LIMIT+6);
    expect(progress.recentExercises[0].seed).toBe(7);
  });

  test('mistakes reduce the mastery signal without making a completion worthless',()=>{
    const exercise=EQUATIONS_3EME_PACK.generateExercise('linear',42);
    const first=recordCompletion(EQUATIONS_3EME_PACK,createEmptyProgress(EQUATIONS_3EME_PACK),exercise,{mistakes:0},new Date('2026-08-25T12:00:00Z'));
    const second=recordCompletion(EQUATIONS_3EME_PACK,first,exercise,{mistakes:3},new Date('2026-08-25T12:01:00Z'));
    expect(second.skills['equation-isolation'].mastery).toBeLessThan(first.skills['equation-isolation'].mastery);
    expect(second.skills['equation-isolation'].mastery).toBeGreaterThan(0);
    expect(second.skills['equation-isolation'].mistakes).toBe(3);
  });

  test('review intervals expand with successful streaks and mastery',()=>{
    const basic={attempts:4,mastery:.5,streak:1,mistakes:0,totalDurationMs:1000,lastSeen:'2026-08-25T12:00:00.000Z'};
    const strong={...basic,mastery:.95,streak:5};
    expect(skillReviewIntervalMs(strong)).toBeGreaterThan(skillReviewIntervalMs(basic));
  });

  test('review urgency rises as a mastered skill becomes overdue',()=>{
    const fresh={attempts:10,mastery:.95,streak:4,mistakes:0,totalDurationMs:10000,lastSeen:'2026-08-25T11:00:00.000Z'};
    const overdue={...fresh,lastSeen:'2026-06-01T12:00:00.000Z'};
    const now=new Date('2026-08-25T12:00:00Z');
    expect(skillReviewUrgency(overdue,now)).toBeGreaterThan(skillReviewUrgency(fresh,now));
    expect(skillReviewUrgency({attempts:0},now)).toBeGreaterThan(1);
  });

  test('skill review state exposes next review time and due skills include unseen knowledge',()=>{
    const exercise=EQUATIONS_3EME_PACK.generateExercise('simple',71);
    const completedAt=new Date('2026-08-25T12:00:00Z');
    const progress=recordCompletion(EQUATIONS_3EME_PACK,createEmptyProgress(EQUATIONS_3EME_PACK),exercise,{},completedAt);
    const state=skillReviewState(EQUATIONS_3EME_PACK,progress,'equation-isolation',completedAt);
    expect(state.attempts).toBe(1);
    expect(state.nextReviewAt).toBeTruthy();
    expect(state.due).toBe(false);

    const later=new Date(Date.parse(state.nextReviewAt)+1);
    expect(skillReviewState(EQUATIONS_3EME_PACK,progress,'equation-isolation',later).due).toBe(true);
    const due=dueSkills(EQUATIONS_3EME_PACK,progress,completedAt);
    expect(due.some(item=>item.skillId==='square-root'&&item.attempts===0)).toBe(true);
  });

  test('progress stores are independent per pack and survive malformed data',()=>{
    const storage=memoryStorage();
    const equationStore=createProgressStore(EQUATIONS_3EME_PACK,{storage,now:()=>new Date('2026-08-25T12:00:00Z')});
    const calculationStore=createProgressStore(CALCUL_LITTERAL_3EME_PACK,{storage,now:()=>new Date('2026-08-25T12:00:00Z')});
    expect(equationStore.key).not.toBe(calculationStore.key);
    equationStore.complete(EQUATIONS_3EME_PACK.generateExercise('simple',1),{mistakes:0});
    expect(equationStore.load().completed).toBe(1);
    expect(equationStore.load().recentExercises).toHaveLength(1);
    expect(calculationStore.load().completed).toBe(0);

    storage.setItem(progressStorageKey(CALCUL_LITTERAL_3EME_PACK),'{broken');
    expect(calculationStore.load().completed).toBe(0);
  });

  test('category progress is evidence-weighted and exposes coverage',()=>{
    const exercise=CALCUL_LITTERAL_3EME_PACK.generateExercise('develop',77);
    const progress=recordCompletion(CALCUL_LITTERAL_3EME_PACK,createEmptyProgress(CALCUL_LITTERAL_3EME_PACK),exercise,{mistakes:0},new Date('2026-08-25T12:00:00Z'));
    const category=categoryMastery(CALCUL_LITTERAL_3EME_PACK,progress,'develop');
    expect(category.rawMastery).toBeGreaterThan(0.8);
    expect(category.mastery).toBeGreaterThan(0.2);
    expect(category.mastery).toBeLessThan(0.4);
    expect(category.coverage).toBe(1);
    expect(category.attempts).toBe(2);

    const reduce=categoryMastery(CALCUL_LITTERAL_3EME_PACK,progress,'reduce');
    expect(reduce.coverage).toBe(0.5);
    expect(reduce.mastery).toBeLessThan(category.mastery);

    const weakest=weakestSkills(CALCUL_LITTERAL_3EME_PACK,progress,1);
    expect(weakest).toHaveLength(1);
    expect(weakest[0].id).toBe('collect-like-terms');
  });
});
