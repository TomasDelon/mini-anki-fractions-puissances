import { describe, expect, test } from 'vitest';
import { analyze } from '../src/math.js';
import { createWorkspace } from '../src/trainer/core.js';
import { compareEquationRelation, validateEquationDerivation } from '../src/trainer/equationRelations.js';

describe('equation relation semantics',()=>{
  test('distinguishes implication from equivalence',()=>{
    expect(compareEquationRelation('x=1','x^2=1','implies').kind).toBe('valid-implication');
    expect(compareEquationRelation('x=1','x^2=1','iff').kind).not.toBe('equivalent');
  });

  test('supports reverse implication',()=>{
    expect(compareEquationRelation('x^2=1','x=1','reverse-implies').kind).toBe('valid-implication');
  });

  test('rejects a false implication',()=>{
    expect(compareEquationRelation('x^2=1','x=1','implies').kind).toBe('invalid-implication');
  });

  test('a logically valid weaker conclusion is not accepted as the final solution',()=>{
    const expected=analyze('x=1').set;
    const exercise={promptLatex:'x=1',expected};
    const workspace=createWorkspace({relationMode:'student',allowedRelations:['implies'],defaultRelation:'implies'});
    const rows=[{id:0,value:'x=1\\text{ ou }x=-1',relationBefore:'implies'}];
    const result=validateEquationDerivation(exercise,rows,workspace);
    expect(result.kind).toBe('continue');
  });

  test('mixed iff and implication chains are validated row by row',()=>{
    const expected=analyze('x^2=1').set;
    const exercise={promptLatex:'x^2=1',expected};
    const workspace=createWorkspace({relationMode:'student',allowedRelations:['iff','implies'],defaultRelation:'iff'});
    const rows=[
      {id:0,value:'x^2=1',relationBefore:'iff'},
      {id:1,value:'x=-1\\text{ ou }x=1',relationBefore:'implies'}
    ];
    expect(validateEquationDerivation(exercise,rows,workspace).kind).toBe('success');
  });
});
