import { describe, expect, test } from 'vitest';
import { TRAINER_PACKS } from '../src/packs/index.js';
import { auditGeneratedExercise, auditTrainerPack } from '../src/trainer/packAudit.js';

describe('generic generated-pack audit',()=>{
  for(const pack of Object.values(TRAINER_PACKS)){
    test(`${pack.id}: deterministic prompts and self-validating corrections`,()=>{
      const report=auditTrainerPack(pack,{seeds:250});
      expect(report.packId).toBe(pack.id);
      expect(report.categories).toEqual(pack.categories);
      expect(report.exercises).toBe(pack.categories.length*250);
      expect(report.correctionSteps).toBeGreaterThan(report.exercises-1);
    });
  }

  test('reports enough reproduction context when an exercise is invalid',()=>{
    const broken={
      ...Object.values(TRAINER_PACKS)[0],
      id:'broken-pack',
      generateExercise(category,seed){
        return {...Object.values(TRAINER_PACKS)[0].generateExercise(category,seed),promptLatex:'\\square'};
      }
    };
    expect(()=>auditGeneratedExercise(broken,broken.categories[0],42)).toThrow(/broken-pack.*seed 42.*placeholder/i);
  });
});
