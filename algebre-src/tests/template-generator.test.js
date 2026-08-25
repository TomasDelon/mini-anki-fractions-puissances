import { describe, expect, test } from 'vitest';
import { createTemplateGenerator, defineExerciseTemplate } from '../src/trainer/templateGenerator.js';

describe('declarative exercise templates',()=>{
  test('instantiates deterministic metadata around a compact build function',()=>{
    const template=defineExerciseTemplate({
      id:'add-small',category:'addition',difficulty:2,skills:['add'],
      build:({rng})=>{
        const a=rng.int(1,9),b=rng.int(1,9);
        return {promptLatex:`${a}+${b}`,expectedLatex:`${a+b}`,correctionLatex:[`${a+b}`]};
      }
    });
    const generator=createTemplateGenerator({packId:'demo',categories:['addition','mixed'],mixedCategory:'mixed',templates:[template]});
    const first=generator.generate('addition',42),second=generator.generate('addition',42);
    expect(first).toEqual(second);
    expect(first).toMatchObject({category:'addition',seed:42,templateId:'add-small',difficulty:2,skills:['add']});
    expect(first.id).toBe('demo:add-small:42');
  });

  test('mixed mode records the source category and remains deterministic',()=>{
    const templates=[
      defineExerciseTemplate({id:'one',category:'a',build:()=>({promptLatex:'1',correctionLatex:['1']})}),
      defineExerciseTemplate({id:'two',category:'b',build:()=>({promptLatex:'2',correctionLatex:['2']})})
    ];
    const generator=createTemplateGenerator({packId:'demo',categories:['a','b','mixed'],mixedCategory:'mixed',templates});
    const exercise=generator.generate('mixed',123);
    expect(['a','b']).toContain(exercise.sourceCategory);
    expect(exercise.category).toBe('mixed');
    expect(exercise.seed).toBe(123);
    expect(generator.generate('mixed',123)).toEqual(exercise);
  });

  test('rejects missing category coverage before runtime',()=>{
    expect(()=>createTemplateGenerator({
      packId:'demo',categories:['a','b'],templates:[
        {id:'only-a',category:'a',build:()=>({promptLatex:'1',correctionLatex:['1']})}
      ]
    })).toThrow(/No exercise template for category b/);
  });
});
