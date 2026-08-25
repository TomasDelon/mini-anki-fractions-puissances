import { describe, expect, test } from 'vitest';
import { CALCUL_LITTERAL_3EME_PACK } from '../src/packs/calculLitteral3eme.js';
import { analyzeExpression, compareExpressions, validateEqualityChain } from '../src/trainer/expressionMath.js';
import { hydrateDerivationRows } from '../src/trainer/core.js';
import { assertExerciseForPack } from '../src/trainer/pack.js';

describe('exact expression engine',()=>{
  test('recognizes distributivity and reduction exactly',()=>{
    expect(compareExpressions('3(x+4)-2x','x+12').kind).toBe('equal');
    expect(compareExpressions('3(x+4)-2x','x+11').kind).toBe('not-equal');
  });

  test('canonicalizes equivalent reduced linear forms',()=>{
    const a=analyzeExpression('6+x');
    const b=analyzeExpression('x+6');
    expect(a.kind).toBe('ok');
    expect(b.kind).toBe('ok');
    expect(a.canonicalLatex).toBe('x+6');
    expect(b.canonicalLatex).toBe('x+6');
  });

  test('does not accept an unchanged unreduced expression as finished',()=>{
    const result=validateEqualityChain('3(x+4)-2x',['3(x+4)-2x'],'x+12');
    expect(result.kind).toBe('continue');
  });

  test('accepts a valid aligned equality derivation',()=>{
    const result=validateEqualityChain('3(x+4)-2x',['3x+12-2x','x+12'],'x+12');
    expect(result.kind).toBe('success');
  });
});

describe('calcul littéral prototype pack',()=>{
  test('uses aligned equals semantics and a desktop compact keyboard',()=>{
    expect(CALCUL_LITTERAL_3EME_PACK.workspace.layout).toBe('aligned');
    expect(CALCUL_LITTERAL_3EME_PACK.workspace.allowedRelations).toEqual(['equals']);
    expect(CALCUL_LITTERAL_3EME_PACK.workspace.defaultRelation).toBe('equals');
    expect(CALCUL_LITTERAL_3EME_PACK.keyboard.desktopMode).toBe('compact');
  });

  for(const category of CALCUL_LITTERAL_3EME_PACK.categories.filter(c=>c!=='mixed')){
    test(`${category}: 5000 generated exercises have exact valid corrections`,()=>{
      for(let seed=1;seed<=5000;seed++){
        const exercise=CALCUL_LITTERAL_3EME_PACK.generateExercise(category,seed);
        expect(()=>assertExerciseForPack(CALCUL_LITTERAL_3EME_PACK,exercise)).not.toThrow();
        expect(exercise.promptLatex.includes('=')).toBe(false);
        let previous=exercise.promptLatex;
        for(const line of exercise.correctionLatex){
          expect(compareExpressions(previous,line).kind,`${category} seed ${seed}: ${previous} = ${line}`).toBe('equal');
          previous=line;
        }
        const rows=hydrateDerivationRows(exercise.correctionLatex,CALCUL_LITTERAL_3EME_PACK.workspace);
        expect(CALCUL_LITTERAL_3EME_PACK.validateExercise(exercise,rows).kind,`${category} seed ${seed}`).toBe('success');
      }
    });
  }
});
