import { Rational, hasPlaceholder } from '../math.js';

class ExpressionParseError extends Error {}

const ZERO=new Rational(0n);
const ONE=new Rational(1n);

function normalize(latex){
  return String(latex ?? '')
    .replace(/−/g,'-')
    .replace(/\\left/g,'').replace(/\\right/g,'')
    .replace(/\\,/g,'').replace(/\\!/g,'').replace(/\\;/g,'')
    .replace(/\\quad|\\qquad/g,'')
    .replace(/\\cdot|\\times/g,'*')
    .replace(/\s+/g,'');
}

function tokenize(s){
  const out=[];
  let i=0;
  while(i<s.length){
    const c=s[i];
    if(/\d/.test(c)){
      let j=i+1; while(j<s.length&&/\d/.test(s[j]))j++;
      out.push({k:'num',v:s.slice(i,j)});i=j;continue;
    }
    const one={x:'x',X:'x','+':'plus','-':'minus','*':'star','/':'slash','(':'lp',')':'rp','{':'lb','}':'rb','^':'pow'}[c];
    if(one){out.push({k:one});i++;continue;}
    if(c==='\\'){
      const rest=s.slice(i);
      if(rest.startsWith('\\frac')){out.push({k:'frac'});i+=5;continue;}
      if(rest.startsWith('\\dfrac')){out.push({k:'frac'});i+=6;continue;}
      throw new ExpressionParseError(`Commande non prise en charge: ${rest.slice(0,12)}`);
    }
    throw new ExpressionParseError(`Caractère non pris en charge: ${c}`);
  }
  return out;
}

class Parser{
  constructor(tokens){this.t=tokens;this.i=0;}
  peek(){return this.t[this.i];}
  take(){return this.t[this.i++];}
  match(k){if(this.peek()?.k===k){this.i++;return true;}return false;}
  expect(k){const t=this.take();if(!t||t.k!==k)throw new ExpressionParseError('Expression incomplète');return t;}
  parse(){const e=this.add();if(this.i!==this.t.length)throw new ExpressionParseError('Expression incomplète ou ambiguë');return e;}
  add(){
    let e=this.mul();
    for(;;){
      if(this.match('plus'))e={k:'add',a:e,b:this.mul()};
      else if(this.match('minus'))e={k:'sub',a:e,b:this.mul()};
      else break;
    }
    return e;
  }
  startsPrimary(t){return !!t&&['num','x','lp','lb','frac'].includes(t.k);}
  mul(){
    let e=this.unary();
    for(;;){
      if(this.match('star'))e={k:'mul',a:e,b:this.unary()};
      else if(this.match('slash'))e={k:'div',a:e,b:this.unary()};
      else if(this.startsPrimary(this.peek()))e={k:'mul',a:e,b:this.unary()};
      else break;
    }
    return e;
  }
  unary(){
    if(this.match('minus'))return {k:'neg',v:this.unary()};
    if(this.match('plus'))return this.unary();
    return this.power();
  }
  power(){
    let e=this.primary();
    if(this.match('pow')){
      let n;
      if(this.match('lb')){n=this.expect('num').v;this.expect('rb');}
      else n=this.expect('num').v;
      if(n!=='2')throw new ExpressionParseError('Seul le carré est pris en charge');
      e={k:'square',v:e};
    }
    return e;
  }
  primary(){
    const t=this.peek();if(!t)throw new ExpressionParseError('Expression incomplète');
    if(t.k==='num'){this.take();return {k:'const',v:new Rational(BigInt(t.v))};}
    if(t.k==='x'){this.take();return {k:'var'};}
    if(t.k==='lp'){this.take();const e=this.add();this.expect('rp');return e;}
    if(t.k==='lb'){this.take();const e=this.add();this.expect('rb');return e;}
    if(t.k==='frac'){this.take();return {k:'div',a:this.group(),b:this.group()};}
    throw new ExpressionParseError('Expression inattendue');
  }
  group(){this.expect('lb');const e=this.add();this.expect('rb');return e;}
}

function parseExpression(latex){
  if(hasPlaceholder(latex))throw new ExpressionParseError('Expression incomplète');
  const normalized=normalize(latex);
  if(!normalized)throw new ExpressionParseError('Expression vide');
  return new Parser(tokenize(normalized)).parse();
}

function trimPoly(p){const q=[...p];while(q.length>1&&q.at(-1).isZero())q.pop();return q;}
function degree(p){return trimPoly(p).length-1;}
function polyAdd(a,b){const n=Math.max(a.length,b.length),r=[];for(let i=0;i<n;i++)r.push((a[i]||ZERO).add(b[i]||ZERO));return trimPoly(r);}
function polyNeg(a){return trimPoly(a.map(v=>v.neg()));}
function polySub(a,b){return polyAdd(a,polyNeg(b));}
function polyMul(a,b){const r=Array.from({length:a.length+b.length-1},()=>ZERO);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)r[i+j]=r[i+j].add(a[i].mul(b[j]));return trimPoly(r);}

function containsX(e){
  if(e.k==='var')return true;
  if(e.k==='const')return false;
  if(['neg','square'].includes(e.k))return containsX(e.v);
  return containsX(e.a)||containsX(e.b);
}

function constValue(e){
  if(e.k==='const')return e.v;
  if(e.k==='var')return null;
  if(e.k==='neg'){const v=constValue(e.v);return v?v.neg():null;}
  if(e.k==='square'){const v=constValue(e.v);return v?v.square():null;}
  const a=constValue(e.a),b=constValue(e.b);if(!a||!b)return null;
  if(e.k==='add')return a.add(b);
  if(e.k==='sub')return a.sub(b);
  if(e.k==='mul')return a.mul(b);
  if(e.k==='div')return b.isZero()?null:a.div(b);
  return null;
}

function toPoly(e){
  if(e.k==='const')return [e.v];
  if(e.k==='var')return [ZERO,ONE];
  if(e.k==='neg'){const p=toPoly(e.v);return p&&polyNeg(p);}
  if(['add','sub','mul'].includes(e.k)){
    const a=toPoly(e.a),b=toPoly(e.b);if(!a||!b)return null;
    const p=e.k==='add'?polyAdd(a,b):e.k==='sub'?polySub(a,b):polyMul(a,b);
    return degree(p)<=2?p:null;
  }
  if(e.k==='div'){
    if(containsX(e.b))return null;
    const d=constValue(e.b);if(!d||d.isZero())return null;
    const p=toPoly(e.a);return p?p.map(v=>v.div(d)):null;
  }
  if(e.k==='square'){
    const p=toPoly(e.v);if(!p)return null;
    const q=polyMul(p,p);return degree(q)<=2?q:null;
  }
  return null;
}

function samePoly(a,b){
  const p=trimPoly(a),q=trimPoly(b);
  return p.length===q.length&&p.every((v,i)=>v.eq(q[i]));
}

function flattenAdditive(e,out=[]){
  if(e.k==='add'){flattenAdditive(e.a,out);flattenAdditive(e.b,out);return out;}
  if(e.k==='sub'){flattenAdditive(e.a,out);flattenAdditive({k:'neg',v:e.b},out);return out;}
  out.push(e);return out;
}

function monomialPower(e){
  const p=toPoly(e);if(!p)return null;
  let found=null;
  for(let power=0;power<p.length;power++){
    if(p[power].isZero())continue;
    if(found!==null)return null;
    found=power;
  }
  return found===null?0:found;
}

function isReducedPolynomialAst(ast){
  const powers=new Set();
  for(const term of flattenAdditive(ast)){
    const power=monomialPower(term);
    if(power===null||powers.has(power))return false;
    powers.add(power);
  }
  return true;
}

function absBig(n){return n<0n?-n:n;}
function termLatex(coeff,power){
  const negative=coeff.n<0n;
  const abs=new Rational(absBig(coeff.n),coeff.d);
  const unit=abs.eq(ONE);
  const coeffText=unit&&power>0?'':abs.toLatex();
  const variable=power===2?'x^2':power===1?'x':'';
  return {negative,text:`${coeffText}${variable}`||'0'};
}

export function canonicalPolynomialLatex(poly){
  const p=trimPoly(poly),parts=[];
  for(let power=p.length-1;power>=0;power--){
    const coeff=p[power]||ZERO;if(coeff.isZero())continue;
    const term=termLatex(coeff,power);
    if(parts.length===0)parts.push(`${term.negative?'-':''}${term.text}`);
    else parts.push(`${term.negative?'-':'+'}${term.text}`);
  }
  return parts.join('')||'0';
}

export function analyzeExpression(latex){
  try{
    const ast=parseExpression(latex);
    const polynomial=toPoly(ast);
    if(!polynomial)return {kind:'unsupported',message:'Écriture hors du moteur de calcul littéral.'};
    return {kind:'ok',polynomial,canonicalLatex:canonicalPolynomialLatex(polynomial),reduced:isReducedPolynomialAst(ast)};
  }catch(error){
    return {kind:'incomplete',message:error instanceof Error?error.message:'Expression incomplète'};
  }
}

export function compareExpressions(previous,next){
  const a=analyzeExpression(previous),b=analyzeExpression(next);
  if(a.kind!=='ok')return {kind:'source-error'};
  if(b.kind!=='ok')return {kind:b.kind,message:b.message};
  return samePoly(a.polynomial,b.polynomial)?{kind:'equal'}:{kind:'not-equal'};
}

export function validateEqualityChain(promptLatex,rows,expectedLatex){
  let previous=promptLatex;
  for(let i=0;i<rows.length;i++){
    const row=String(rows[i] ?? '').trim();
    if(!row||hasPlaceholder(row))return {kind:'incomplete',row:i,message:'Expression incomplète.'};
    const result=compareExpressions(previous,row);
    if(result.kind==='incomplete'||result.kind==='unsupported')return {kind:'incomplete',row:i,message:result.message||'Expression incomplète.'};
    if(result.kind!=='equal')return {kind:'error',row:i,message:'Cette étape n’est pas égale à la précédente.'};
    previous=row;
  }

  const last=String(rows.at(-1) ?? '').trim();
  if(!last)return {kind:'incomplete',row:0,message:'Écris au moins une étape.'};
  const actual=analyzeExpression(last),expected=analyzeExpression(expectedLatex);
  if(actual.kind!=='ok'||expected.kind!=='ok')return {kind:'continue',message:'Correct jusqu’ici. Continue le calcul.'};
  const equivalent=samePoly(actual.polynomial,expected.polynomial);
  return equivalent&&actual.reduced?{kind:'success'}:{kind:'continue',message:'Correct jusqu’ici. Continue à développer ou réduire.'};
}
