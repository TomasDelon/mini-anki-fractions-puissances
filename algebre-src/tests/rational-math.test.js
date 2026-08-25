import { describe, expect, test } from 'vitest';
import { Rational } from '../src/math.js';
import { analyzeRational, isReducedRationalLatex, validateRationalChain } from '../src/trainer/rationalMath.js';

describe('exact rational math',()=>{
  test('evaluates constant fraction expressions exactly',()=>{
    const result=analyzeRational('\\frac{1}{3}+\\frac{1}{6}');
    expect(result.kind).toBe('ok');
    expect(result.value.eq(new Rational(1n,2n))).toBe(true);
  });

  test('rejects expressions containing x from a numeric fraction workspace',()=>{
    expect(analyzeRational('x+1').kind).toBe('unsupported');
  });

  test('recognizes reduced and unreduced final fractions structurally',()=>{
    const value=new Rational(3n,2n);
    expect(isReducedRationalLatex('\\frac{3}{2}',value)).toBe(true);
    expect(isReducedRationalLatex('-\\frac{3}{2}',new Rational(-3n,2n))).toBe(true);
    expect(isReducedRationalLatex('\\frac{6}{4}',value)).toBe(false);
    expect(isReducedRationalLatex('3/2',value)).toBe(false);
  });

  test('accepts an equality chain only when the final fraction is simplified',()=>{
    expect(validateRationalChain('\\frac{1}{2}+\\frac{1}{4}',['\\frac{2}{4}+\\frac{1}{4}','\\frac{3}{4}'],'\\frac{3}{4}')).toEqual({kind:'success'});
    expect(validateRationalChain('\\frac{1}{2}+\\frac{1}{4}',['\\frac{6}{8}'],'\\frac{3}{4}')).toMatchObject({kind:'continue'});
  });

  test('detects a mathematically invalid intermediate step',()=>{
    const result=validateRationalChain('\\frac{1}{2}+\\frac{1}{4}',['\\frac{2}{6}'],'\\frac{3}{4}');
    expect(result).toMatchObject({kind:'error',row:0});
  });
});
