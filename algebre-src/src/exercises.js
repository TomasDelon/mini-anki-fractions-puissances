import { Rational, Sets } from './math.js';

export const CATEGORY_INFO = {
  simple: { title:'Équations simples', formula:'x+a=b' },
  linear: { title:'Équations linéaires', formula:'ax+b=c' },
  'both-sides': { title:'Inconnue des deux côtés', formula:'ax+b=cx+d' },
  parentheses: { title:'Parenthèses', formula:'a(x+b)+c=d' },
  fractions: { title:'Fractions', formula:'\\dfrac{x+b}{a}+c=d' },
  squares: { title:'Carrés et racines', formula:'x^2=r^2' },
  'pure-quadratic': { title:'Équations quadratiques particulières', formula:'ax^2+c=0' },
  'common-factor': { title:'Mise en facteur', formula:'ax^2+bx=0' },
  identities: { title:'Identités remarquables', formula:'(a\\pm b)^2,\\quad a^2-b^2' },
  factorable: { title:'Trinômes factorisables', formula:'(x-r_1)(x-r_2)=0' },
  mixed: { title:'Mélange', formula:'\\text{toutes les catégories}' }
};
export const CATEGORIES = Object.keys(CATEGORY_INFO);
const BASE_CATEGORIES = CATEGORIES.filter(c=>c!=='mixed');

export class RNG {
  constructor(seed) { this.state = (seed>>>0) || 0x9e3779b9; }
  next() { let x=this.state; x^=x<<13; x^=x>>>17; x^=x<<5; this.state=x>>>0; return this.state/2**32; }
  int(min,max) { return Math.floor(this.next()*(max-min+1))+min; }
  pick(a) { return a[this.int(0,a.length-1)]; }
  nonZero(min=-9,max=9) { let n=0; while(n===0) n=this.int(min,max); return n; }
}

export function randomSeed() {
  if (globalThis.crypto?.getRandomValues) { const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]>>>0; }
  return (Date.now() ^ Math.floor(Math.random()*0xffffffff))>>>0;
}

const finiteInts = (...values) => Sets.finite(values.map(v=>new Rational(BigInt(v))));
const signed = n => n<0 ? `${n}` : `+${n}`;
const xTerm = a => a===1?'x':a===-1?'-x':`${a}x`;
const x2Term = a => a===1?'x^2':a===-1?'-x^2':`${a}x^2`;
const coeffTerm = (a,symbol) => a===0?'':a===1?`+${symbol}`:a===-1?`-${symbol}`:a>0?`+${a}${symbol}`:`${a}${symbol}`;
const clean = s => s.replace(/\+\-/g,'-').replace(/\s+/g,'');
const or = (a,b) => `${a}\\text{ ou }${b}`;
const fmtBinomial = (shift=0) => shift===0?'x':`x${shift>0?'+':''}${shift}`;

function simple(seed) {
  const r=new RNG(seed), kind=r.int(0,2), s=r.int(-12,12);
  if(kind===0){ const a=r.nonZero(-12,12), b=s+a; return ex('simple',seed,clean(`x${signed(a)}=${b}`),finiteInts(s),[`x=${s}`]); }
  if(kind===1){ const a=r.nonZero(-9,9), b=a*s; return ex('simple',seed,`${xTerm(a)}=${b}`,finiteInts(s),[`x=${s}`]); }
  const a=r.int(2,9), b=r.int(-10,10); return ex('simple',seed,`\\frac{x}{${a}}=${b}`,finiteInts(a*b),[`x=${a*b}`]);
}
function linear(seed) {
  const r=new RNG(seed), s=r.int(-12,12), a=r.nonZero(-9,9), b=r.nonZero(-15,15), c=a*s+b;
  return ex('linear',seed,clean(`${xTerm(a)}${signed(b)}=${c}`),finiteInts(s),[`${xTerm(a)}=${a*s}`,`x=${s}`]);
}
function bothSides(seed) {
  const r=new RNG(seed), s=r.int(-10,10); let a=r.nonZero(-8,8), c=r.nonZero(-8,8); while(a===c)c=r.nonZero(-8,8);
  const b=r.nonZero(-12,12), d=(a-c)*s+b;
  return ex('both-sides',seed,clean(`${xTerm(a)}${signed(b)}=${xTerm(c)}${signed(d)}`),finiteInts(s),[
    clean(`${xTerm(a-c)}=${d-b}`),`x=${s}`
  ]);
}
function parentheses(seed) {
  const r=new RNG(seed), s=r.int(-10,10), a=r.nonZero(-7,7), h=r.nonZero(-9,9), k=r.nonZero(-10,10), d=a*(s+h)+k;
  const constant=a*h+k;
  return ex('parentheses',seed,clean(`${a}(${fmtBinomial(h)})${signed(k)}=${d}`),finiteInts(s),[
    clean(`${xTerm(a)}${signed(constant)}=${d}`),`${xTerm(a)}=${a*s}`,`x=${s}`
  ]);
}
function fractions(seed) {
  const r=new RNG(seed), kind=r.int(0,2), q=r.int(2,9);
  if(kind===0){ const b=r.nonZero(-8,8), t=r.int(-10,10), s=q*t; return ex('fractions',seed,clean(`\\frac{x}{${q}}${signed(b)}=${t+b}`),finiteInts(s),[`\\frac{x}{${q}}=${t}`,`x=${s}`]); }
  if(kind===1){ const h=r.nonZero(-9,9), t=r.int(-10,10), s=q*t-h; return ex('fractions',seed,`\\frac{${fmtBinomial(h)}}{${q}}=${t}`,finiteInts(s),[`${fmtBinomial(h)}=${q*t}`,`x=${s}`]); }
  const h=r.nonZero(-9,9), k=r.nonZero(-7,7), t=r.int(-9,9), s=q*t-h;
  return ex('fractions',seed,clean(`\\frac{${fmtBinomial(h)}}{${q}}${signed(k)}=${t+k}`),finiteInts(s),[
    `\\frac{${fmtBinomial(h)}}{${q}}=${t}`,`${fmtBinomial(h)}=${q*t}`,`x=${s}`
  ]);
}
function squares(seed) {
  const r=new RNG(seed).int(1,12);
  return ex('squares',seed,`x^2=${r*r}`,finiteInts(-r,r),[`|x|=${r}`,or(`x=-${r}`,`x=${r}`)]);
}
function pureQuadratic(seed) {
  const g=new RNG(seed), a=g.int(2,7), r=g.int(1,9), c=-a*r*r;
  return ex('pure-quadratic',seed,clean(`${x2Term(a)}${signed(c)}=0`),finiteInts(-r,r),[
    `${x2Term(a)}=${a*r*r}`,`x^2=${r*r}`,`|x|=${r}`,or(`x=-${r}`,`x=${r}`)
  ]);
}
function commonFactor(seed) {
  const g=new RNG(seed), a=g.int(2,7); let r=g.int(-9,9); while(r===0)r=g.int(-9,9); const b=-a*r;
  return ex('common-factor',seed,clean(`${x2Term(a)}${coeffTerm(b,'x')}=0`),finiteInts(0,r),[
    clean(`x(${xTerm(a)}${signed(b)})=0`),or('x=0',clean(`${xTerm(a)}${signed(b)}=0`)),or('x=0',`x=${r}`)
  ]);
}
function identities(seed) {
  const g=new RNG(seed), kind=g.int(0,2);
  if(kind===0){ let r=g.int(-9,9); while(r===0)r=g.int(-9,9); const b=-2*r, c=r*r; return ex('identities',seed,clean(`x^2${coeffTerm(b,'x')}${signed(c)}=0`),finiteInts(r),[`(x${r>0?'-':'+'}${Math.abs(r)})^2=0`,`x=${r}`]); }
  if(kind===1){ const r=g.int(2,12); return ex('identities',seed,`x^2-${r*r}=0`,finiteInts(-r,r),[`(x-${r})(x+${r})=0`,or(`x=-${r}`,`x=${r}`)]); }
  let a=g.int(-7,7); const b=g.int(2,9); while(a===0||Math.abs(a)===b)a=g.int(-7,7);
  const lin=2*a, constant=a*a-b*b, r1=-a-b, r2=-a+b;
  return ex('identities',seed,clean(`x^2${coeffTerm(lin,'x')}${signed(constant)}=0`),finiteInts(r1,r2),[
    clean(`(${fmtBinomial(a)})^2-${b*b}=0`),clean(`(${fmtBinomial(a-b)})(${fmtBinomial(a+b)})=0`),or(`x=${r1}`,`x=${r2}`)
  ]);
}
function factorable(seed) {
  const g=new RNG(seed); let r1=g.int(-9,9),r2=g.int(-9,9);
  while(r1===0||r2===0||r1===r2||r1===-r2){r1=g.int(-9,9);r2=g.int(-9,9);}
  const b=-(r1+r2), c=r1*r2;
  return ex('factorable',seed,clean(`x^2${coeffTerm(b,'x')}${signed(c)}=0`),finiteInts(r1,r2),[
    clean(`(${fmtBinomial(-r1)})(${fmtBinomial(-r2)})=0`),or(`x=${r1}`,`x=${r2}`)
  ]);
}
function ex(category,seed,promptLatex,expected,correctionLatex){ return {id:`${category}:${seed}`,category,seed,promptLatex,expected,correctionLatex}; }

export function generateExercise(category, seed) {
  if(category==='mixed'){ const chosen=new RNG(seed).pick(BASE_CATEGORIES); const inner=generateExercise(chosen,(seed^0xa5a5a5a5)>>>0); return {...inner,id:`mixed:${seed}`,category:'mixed',seed}; }
  return ({simple,linear,'both-sides':bothSides,parentheses,fractions,squares,'pure-quadratic':pureQuadratic,'common-factor':commonFactor,identities,factorable})[category](seed);
}
