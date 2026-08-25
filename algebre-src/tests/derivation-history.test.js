import { describe, expect, test } from 'vitest';
import {
  canRedoDerivation,
  canUndoDerivation,
  commitDerivationHistory,
  createDerivationHistory,
  redoDerivationHistory,
  resetDerivationHistory,
  undoDerivationHistory
} from '../src/trainer/derivationHistory.js';

const snapshot=(value,activeId=1)=>({rows:[{id:1,value,relationBefore:'iff'}],activeId});

describe('derivation history',()=>{
  test('undoes and redoes mathematical edits',()=>{
    let history=createDerivationHistory(snapshot('x+1=2'));
    history=commitDerivationHistory(history,snapshot('x=1'));
    expect(canUndoDerivation(history)).toBe(true);
    expect(history.present.rows[0].value).toBe('x=1');

    history=undoDerivationHistory(history);
    expect(history.present.rows[0].value).toBe('x+1=2');
    expect(canRedoDerivation(history)).toBe(true);

    history=redoDerivationHistory(history);
    expect(history.present.rows[0].value).toBe('x=1');
  });

  test('a new edit after undo clears the redo branch',()=>{
    let history=createDerivationHistory(snapshot('a'));
    history=commitDerivationHistory(history,snapshot('ab'));
    history=commitDerivationHistory(history,snapshot('abc'));
    history=undoDerivationHistory(history);
    expect(canRedoDerivation(history)).toBe(true);
    history=commitDerivationHistory(history,snapshot('abx'));
    expect(canRedoDerivation(history)).toBe(false);
    expect(history.present.rows[0].value).toBe('abx');
  });

  test('deduplicates identical snapshots and preserves the active row',()=>{
    const initial={rows:[{id:4,value:'x=2',relationBefore:'iff'},{id:9,value:'',relationBefore:'iff'}],activeId:9};
    let history=createDerivationHistory(initial);
    history=commitDerivationHistory(history,initial);
    expect(history.past).toHaveLength(0);
    expect(history.present.activeId).toBe(9);
  });

  test('bounds old snapshots and can reset for a new exercise',()=>{
    let history=createDerivationHistory(snapshot('0'),{limit:2});
    history=commitDerivationHistory(history,snapshot('1'));
    history=commitDerivationHistory(history,snapshot('2'));
    history=commitDerivationHistory(history,snapshot('3'));
    expect(history.past).toHaveLength(2);
    history=resetDerivationHistory(history,{rows:[{id:8,value:'',relationBefore:'equals'}],activeId:8});
    expect(history.past).toHaveLength(0);
    expect(history.present.activeId).toBe(8);
    expect(history.present.rows[0].relationBefore).toBe('equals');
  });
});
