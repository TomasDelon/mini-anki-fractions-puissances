import { Rational, hasPlaceholder } from '../math.js';
import { analyzeExpression } from './expressionMath.js';

function absBig(value){return value<0n?-value:value;}
function gcd(a,b){a=absBig(a);b=absBig(b);while(b)[a,b]=[b,a%b];return a||1n;}

function normalizeLatex(latex){
  return String(latex??'')
    .replace(/−/g,'-')
    .replace(/\\left|\\right/g,'')
    .replace(/\\dfrac/g,'\\frac')
    .replace(/\s+/g,'');
}

export function analyzeRational(latex){
  if(hasPlaceholder(latex))return {kind:'incomplete',message:'Expression incomplète.'};
  const result=analyzeExpression(latex);
  if(result.kind!=='ok')return result;
  if(result.polynomial.length!==1)return {kind:'unsupported',message:'Une valeur numérique est attendue.'};
  const value=result.polynomial[0];
  return {kind:'ok',value,canonicalLatex:value.toLatex()};
}

export function isReducedRationalLatex(latex,value){
  if(!(value instanceof Rational))return false;
  const text=normalizeLatex(latex);
  if(value.d===1n)return text===String(value.n);

  const match=text.match(/^([+-]?)\\frac\{([+-]?\d+)\}\{([+-]?\d+)\}$/);
  if(!match)return false;
  const outer=match[1]==='-'?-1n:1n;
  const numerator=outer*BigInt(match[2]);
  const denominator=BigInt(match[3]);
  if(denominator<=0n||gcd(numerator,denominator)!==1n)return false;
  return new Rational(numerator,denominator).eq(value);
}

export function compareRationals(previous,next){
  const a=analyzeRational(previous),b=analyzeRational(next);
  if(a.kind!=='ok')return {kind:'source-error',message:a.message};
  if(b.kind!=='ok')return {kind:b.kind,message:b.message};
  return a.value.eq(b.value)?{kind:'equal',value:b.value}:{kind:'not-equal'};
}

export function validateRationalChain(promptLatex,rows,expectedLatex){
  let previous=promptLatex;
  for(let index=0;index<rows.length;index++){
    const row=String(rows[index]??'').trim();
    if(!row||hasPlaceholder(row))return {kind:'incomplete',row:index,message:'Expression incomplète.'};
    const comparison=compareRationals(previous,row);
    if(comparison.kind==='incomplete'||comparison.kind==='unsupported')return {kind:'incomplete',row:index,message:comparison.message||'Expression incomplète.'};
    if(comparison.kind!=='equal')return {kind:'error',row:index,message:'Cette étape n’est pas égale à la précédente.'};
    previous=row;
  }

  const last=String(rows.at(-1)??'').trim();
  if(!last)return {kind:'incomplete',row:0,message:'Écris au moins une étape.'};
  const actual=analyzeRational(last),expected=analyzeRational(expectedLatex);
  if(actual.kind!=='ok'||expected.kind!=='ok')return {kind:'continue',message:'Correct jusqu’ici. Continue le calcul.'};
  if(!actual.value.eq(expected.value))return {kind:'continue',message:'Correct jusqu’ici. Continue le calcul.'};
  if(!isReducedRationalLatex(last,actual.value))return {kind:'continue',message:'La valeur est correcte. Simplifie la fraction.'};
  return {kind:'success'};
}
