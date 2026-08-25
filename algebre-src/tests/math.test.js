import { describe, expect, test } from 'vitest';
import { analyze, compareSteps, isTerminal, setEqual, validateChain } from '../src/math.js';
import { CATEGORIES, generateExercise } from '../src/exercises.js';

const BASE=CATEGORIES.filter(c=>c!=='mixed');

describe('generated exercises',()=>{
  for(const category of BASE){
    test(`${category}: prompts and corrections are exact`,()=>{
      for(let seed=1;seed<=5000;seed++){
        const ex=generateExercise(category,seed);
        const prompt=analyze(ex.promptLatex);
        expect(prompt.kind,`${category} seed ${seed}: ${ex.promptLatex}`).toBe('ok');
        expect(setEqual(prompt.set,ex.expected),`${category} seed ${seed}: wrong expected set`).toBe(true);
        let prev=ex.promptLatex;
        for(const line of ex.correctionLatex){
          expect(compareSteps(prev,line).kind,`${category} seed ${seed}: ${prev} -> ${line}`).toBe('equivalent');
          prev=line;
        }
        expect(isTerminal(prev),`${category} seed ${seed}: terminal ${prev}`).toBe(true);
        expect(validateChain(ex.promptLatex,ex.correctionLatex).kind,`${category} seed ${seed}: validation`).toBe('success');
      }
    });
  }
});

describe('equivalence diagnostics',()=>{
  test('losing x=0 is detected',()=>{
    expect(compareSteps('x(x-3)=0','x=3').kind).toBe('lost-solutions');
  });
  test('dropping the negative square root is detected',()=>{
    expect(compareSteps('x^2=9','x=3').kind).toBe('lost-solutions');
  });
  test('adding a square root is detected',()=>{
    expect(compareSteps('x=3','x^2=9').kind).toBe('added-solutions');
  });
  test('ou and plus-minus are equivalent',()=>{
    expect(compareSteps('x=-3\\text{ ou }x=3','x=\\pm3').kind).toBe('equivalent');
  });
  test('sqrt(x²)=3 and |x|=3 are equivalent',()=>{
    expect(compareSteps('\\sqrt{x^2}=3','|x|=3').kind).toBe('equivalent');
  });
  test('variable denominators are outside this 3eme application',()=>{
    expect(analyze('\\frac{x}{x}=1').kind).toBe('unsupported');
  });
});
