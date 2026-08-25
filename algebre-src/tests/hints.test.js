import { describe, expect, test } from 'vitest';
import { CALCUL_LITTERAL_3EME_PACK } from '../src/packs/calculLitteral3eme.js';
import { EQUATIONS_3EME_PACK } from '../src/packs/equations3eme.js';
import { completionHintCost, createHintSequence, revealHintCount, visibleHints } from '../src/trainer/hints.js';

describe('progressive hints',()=>{
  test('starts with a conceptual skill hint before revealing correction mathematics',()=>{
    const exercise=EQUATIONS_3EME_PACK.generateExercise('parentheses',12345);
    const sequence=createHintSequence(EQUATIONS_3EME_PACK,exercise);
    expect(sequence.length).toBeGreaterThan(1);
    expect(sequence[0]).toMatchObject({id:'strategy',kind:'text',title:'Piste'});
    expect(sequence[0].text).toMatch(/parenthèses|développe/i);
    expect(sequence[1]).toMatchObject({kind:'math',latex:exercise.correctionLatex[0]});
  });

  test('works unchanged for another trainer pack',()=>{
    const exercise=CALCUL_LITTERAL_3EME_PACK.generateExercise('reduce',99);
    const sequence=createHintSequence(CALCUL_LITTERAL_3EME_PACK,exercise);
    expect(sequence[0].kind).toBe('text');
    expect(sequence[0].text).toMatch(/regroupe/i);
    expect(sequence.at(-1).latex).toBe(exercise.correctionLatex.at(-1));
  });

  test('reveal count saturates and visible hints preserve order',()=>{
    const exercise=EQUATIONS_3EME_PACK.generateExercise('simple',9);
    const sequence=createHintSequence(EQUATIONS_3EME_PACK,exercise);
    let count=0;
    for(let i=0;i<sequence.length+4;i++)count=revealHintCount(sequence,count);
    expect(count).toBe(sequence.length);
    expect(visibleHints(sequence,1)).toEqual([sequence[0]]);
    expect(visibleHints(sequence,count)).toEqual(sequence);
  });

  test('full correction has at least the cost of two progressive hints',()=>{
    expect(completionHintCost()).toBe(0);
    expect(completionHintCost({revealed:1})).toBe(1);
    expect(completionHintCost({revealed:1,fullCorrection:true})).toBe(2);
    expect(completionHintCost({revealed:4,fullCorrection:true})).toBe(4);
  });
});
