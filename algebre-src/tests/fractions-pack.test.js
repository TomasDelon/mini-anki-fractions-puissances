import { describe, expect, test } from 'vitest';
import { FRACTIONS_PACK } from '../src/packs/fractions.js';
import { hydrateDerivationRows } from '../src/trainer/core.js';
import { assertExerciseForPack } from '../src/trainer/pack.js';
import { analyzeRational, compareRationals } from '../src/trainer/rationalMath.js';

describe('fractions trainer pack',()=>{
  test('uses aligned equality, a dedicated keyboard and exact arithmetic',()=>{
    expect(FRACTIONS_PACK.workspace.layout).toBe('aligned');
    expect(FRACTIONS_PACK.workspace.allowedRelations).toEqual(['equals']);
    expect(FRACTIONS_PACK.keyboard.profile).toBe('fractions');
    expect(FRACTIONS_PACK.keyboard.mobileMode).toBe('full');
    expect(FRACTIONS_PACK.keyboard.desktopMode).toBe('compact');
    expect(analyzeRational('\\frac{3}{4}\\div\\frac{2}{5}').canonicalLatex).toBe('\\frac{15}{8}');
  });

  test('mixed exercises expose their actual source category for progress',()=>{
    for(let seed=1;seed<=200;seed++){
      const exercise=FRACTIONS_PACK.generateExercise('mixed',seed);
      expect(FRACTIONS_PACK.categories).toContain(exercise.sourceCategory);
      expect(exercise.sourceCategory).not.toBe('mixed');
      expect(exercise.category).toBe('mixed');
    }
  });

  for(const category of FRACTIONS_PACK.categories.filter(category=>category!=='mixed')){
    test(`${category}: 3000 generated exercises stay exact and have valid corrections`,()=>{
      for(let seed=1;seed<=3000;seed++){
        const exercise=FRACTIONS_PACK.generateExercise(category,seed);
        expect(()=>assertExerciseForPack(FRACTIONS_PACK,exercise)).not.toThrow();
        expect(exercise.promptLatex.includes('=')).toBe(false);
        expect(analyzeRational(exercise.promptLatex).kind,`${category} seed ${seed}: prompt`).toBe('ok');
        expect(analyzeRational(exercise.expectedLatex).kind,`${category} seed ${seed}: expected`).toBe('ok');

        let previous=exercise.promptLatex;
        for(const line of exercise.correctionLatex){
          expect(compareRationals(previous,line).kind,`${category} seed ${seed}: ${previous} = ${line}`).toBe('equal');
          previous=line;
        }

        const rows=hydrateDerivationRows(exercise.correctionLatex,FRACTIONS_PACK.workspace);
        expect(FRACTIONS_PACK.validateExercise(exercise,rows).kind,`${category} seed ${seed}`).toBe('success');
      }
    });
  }
});
