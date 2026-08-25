import { analyze, compareSteps, hasPlaceholder, isTerminal, setEqual } from '../math.js';
import { normalizeRelation } from './core.js';

function contains(set,value){
  return set.kind==='all'||set.kind==='finite'&&set.values.some(candidate=>candidate.eq(value));
}

function subset(a,b){
  if(a.kind==='unsupported'||b.kind==='unsupported')return null;
  if(a.kind==='empty'||b.kind==='all')return true;
  if(a.kind==='all')return b.kind==='all';
  if(b.kind==='empty')return a.kind==='empty';
  return a.values.every(value=>contains(b,value));
}

function analyzePair(previous,next){
  const a=analyze(previous),b=analyze(next);
  if(a.kind!=='ok')return {kind:'source-error'};
  if(b.kind!=='ok')return {kind:b.kind,message:b.message};
  return {kind:'ok',a:a.set,b:b.set};
}

export function compareEquationRelation(previous,next,relation){
  if(relation==='iff')return compareSteps(previous,next);
  const pair=analyzePair(previous,next);
  if(pair.kind!=='ok')return pair;
  if(relation==='implies')return subset(pair.a,pair.b)===true?{kind:'valid-implication'}:{kind:'invalid-implication'};
  if(relation==='reverse-implies')return subset(pair.b,pair.a)===true?{kind:'valid-implication'}:{kind:'invalid-implication'};
  return {kind:'unsupported-relation'};
}

function relationError(result,relation){
  if(result.kind==='lost-solutions')return 'Tu as perdu une ou plusieurs solutions : ce n’est pas une équivalence.';
  if(result.kind==='added-solutions')return 'Tu as ajouté une ou plusieurs solutions : ce n’est pas une équivalence.';
  if(result.kind==='invalid-implication')return relation==='reverse-implies'?'Cette implication vers la gauche n’est pas vraie.':'Cette implication n’est pas vraie.';
  if(result.kind==='unsupported-relation')return 'Cette relation n’est pas prise en charge pour cet exercice.';
  if(result.kind==='unsupported')return 'Cette écriture est hors programme de cette application.';
  if(result.kind==='incomplete')return 'Expression incomplète.';
  return relation==='iff'?'Cette étape n’est pas équivalente à la précédente.':'Cette étape logique n’est pas valide.';
}

export function validateEquationDerivation(exercise,rows,workspace){
  let previous=exercise.promptLatex;
  for(let i=0;i<rows.length;i++){
    const value=String(rows[i]?.value ?? '').trim();
    if(!value||hasPlaceholder(value))return {kind:'incomplete',row:i,message:'Expression incomplète.'};
    const relation=normalizeRelation(rows[i].relationBefore,workspace);
    const result=compareEquationRelation(previous,value,relation);
    const valid=result.kind==='equivalent'||result.kind==='valid-implication';
    if(!valid)return {kind:result.kind==='incomplete'||result.kind==='unsupported'?'incomplete':'error',row:i,message:relationError(result,relation)};
    previous=value;
  }

  const last=String(rows.at(-1)?.value ?? '').trim();
  if(!last)return {kind:'incomplete',row:0,message:'Écris au moins une étape.'};
  const analyzed=analyze(last);
  if(analyzed.kind!=='ok')return {kind:'incomplete',row:rows.length-1,message:'Expression incomplète.'};
  const exact=exercise.expected?setEqual(analyzed.set,exercise.expected):true;
  if(isTerminal(last)&&exact)return {kind:'success'};
  if(isTerminal(last)&&!exact)return {kind:'continue',message:'Le raisonnement est valide, mais la conclusion ne donne pas encore exactement toutes les solutions.'};
  return {kind:'continue',message:'Correct jusqu’ici. Continue la résolution.'};
}
