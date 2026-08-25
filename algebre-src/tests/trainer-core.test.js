import { describe, expect, test } from 'vitest';
import {
  RELATIONS,
  createWorkspace,
  cycleRelation,
  hydrateDerivationRows,
  serializeDerivationRows,
  validateDerivation
} from '../src/trainer/core.js';
import { getKeyDefinition, getKeyboardProfile, validateKeyboardProfile } from '../src/trainer/keyboardProfiles.js';
import { EQUATIONS_3EME_PACK } from '../src/packs/equations3eme.js';

describe('generic derivation relation model',()=>{
  test('supports equality, equivalence and implication as distinct semantics',()=>{
    expect(RELATIONS.equals.symbol).toBe('=');
    expect(RELATIONS.equals.semantics).toBe('value-equality');
    expect(RELATIONS.iff.symbol).toBe('⇔');
    expect(RELATIONS.iff.semantics).toBe('equivalence');
    expect(RELATIONS.implies.symbol).toBe('⇒');
    expect(RELATIONS.implies.semantics).toBe('implication');
  });

  test('supports future aligned calculations using equals',()=>{
    const workspace=createWorkspace({
      layout:'aligned',
      relationMode:'automatic',
      allowedRelations:['equals'],
      defaultRelation:'equals'
    });
    const rows=hydrateDerivationRows(['2(x+3)','2x+6','10'],workspace);
    expect(rows.every(row=>row.relationBefore==='equals')).toBe(true);
  });

  test('student relation mode can cycle iff and implies on mobile or desktop',()=>{
    const workspace=createWorkspace({
      relationMode:'student',
      allowedRelations:['iff','implies'],
      defaultRelation:'iff'
    });
    expect(cycleRelation('iff',workspace)).toBe('implies');
    expect(cycleRelation('implies',workspace)).toBe('iff');
  });

  test('legacy string sessions migrate without losing student work',()=>{
    const workspace=EQUATIONS_3EME_PACK.workspace;
    const rows=hydrateDerivationRows(['3x=9','x=3'],workspace);
    expect(serializeDerivationRows(rows)).toEqual([
      {value:'3x=9',relationBefore:'iff'},
      {value:'x=3',relationBefore:'iff'}
    ]);
  });

  test('validation dispatches according to relation semantics',()=>{
    const iff=createWorkspace({allowedRelations:['iff'],defaultRelation:'iff'});
    const eq=createWorkspace({layout:'aligned',allowedRelations:['equals'],defaultRelation:'equals'});
    const implication=createWorkspace({allowedRelations:['implies'],defaultRelation:'implies'});
    const validators={
      iffChain:()=>({kind:'iff'}),
      equalsChain:()=>({kind:'equals'}),
      impliesChain:()=>({kind:'implies'})
    };
    expect(validateDerivation('P',hydrateDerivationRows(['Q'],iff),iff,validators).kind).toBe('iff');
    expect(validateDerivation('A',hydrateDerivationRows(['B'],eq),eq,validators).kind).toBe('equals');
    expect(validateDerivation('P',hydrateDerivationRows(['Q'],implication),implication,validators).kind).toBe('implies');
  });
});

describe('declarative keyboard profiles',()=>{
  test('the 3eme pack points to a valid reusable profile',()=>{
    const profile=getKeyboardProfile(EQUATIONS_3EME_PACK.keyboard.profile);
    expect(validateKeyboardProfile(profile)).toBe(true);
    expect(profile.grid).toContain('fraction');
    expect(profile.grid).toContain('sqrt');
    expect(profile.bottom).toEqual(['select','left','right','backspace','enter']);
  });

  test('relation keys already exist for future =, iff and implication workspaces',()=>{
    expect(getKeyDefinition('relationEquals').action.relation).toBe('equals');
    expect(getKeyDefinition('relationIff').action.relation).toBe('iff');
    expect(getKeyDefinition('relationImplies').action.relation).toBe('implies');
    expect(validateKeyboardProfile(getKeyboardProfile('derivation-relations'))).toBe(true);
  });
});

describe('equations 3eme pack contract',()=>{
  test('keeps equivalence automatic for the current app',()=>{
    expect(EQUATIONS_3EME_PACK.workspace.relationMode).toBe('automatic');
    expect(EQUATIONS_3EME_PACK.workspace.allowedRelations).toEqual(['iff']);
    expect(EQUATIONS_3EME_PACK.workspace.defaultRelation).toBe('iff');
  });

  test('records the pedagogical scope explicitly',()=>{
    expect(EQUATIONS_3EME_PACK.pedagogy.domainAnalysis).toBe(false);
    expect(EQUATIONS_3EME_PACK.pedagogy.forbiddenTechniques).toContain('discriminant');
    expect(EQUATIONS_3EME_PACK.pedagogy.forbiddenTechniques).toContain('generic-trinomial-root-finding');
  });
});
