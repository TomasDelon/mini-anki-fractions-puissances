export class Rational {
  constructor(n, d = 1n) {
    n = BigInt(n); d = BigInt(d);
    if (d === 0n) throw new Error('Division par zéro');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(absBig(n), d);
    this.n = n / g; this.d = d / g;
  }
  add(o) { return new Rational(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Rational(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Rational(this.n * o.n, this.d * o.d); }
  div(o) { if (o.n === 0n) throw new Error('Division par zéro'); return new Rational(this.n * o.d, this.d * o.n); }
  neg() { return new Rational(-this.n, this.d); }
  abs() { return new Rational(absBig(this.n), this.d); }
  square() { return this.mul(this); }
  eq(o) { return this.n === o.n && this.d === o.d; }
  compare(o) { const v = this.n * o.d - o.n * this.d; return v < 0n ? -1 : v > 0n ? 1 : 0; }
  isZero() { return this.n === 0n; }
  isNegative() { return this.n < 0n; }
  isInteger() { return this.d === 1n; }
  key() { return `${this.n}/${this.d}`; }
  toLatex() { return this.d === 1n ? `${this.n}` : `\\frac{${this.n}}{${this.d}}`; }
}
Rational.ZERO = new Rational(0n);
Rational.ONE = new Rational(1n);

function absBig(n) { return n < 0n ? -n : n; }
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a || 1n; }
function lcm(a, b) { return absBig(a / gcd(absBig(a), absBig(b)) * b); }
function intSqrt(n) {
  if (n < 0n) return null;
  if (n < 2n) return n;
  let x = n, y = (x + n / x) >> 1n;
  while (y < x) { x = y; y = (x + n / x) >> 1n; }
  return x * x === n ? x : null;
}
function sqrtRational(r) {
  if (r.isNegative()) return null;
  const a = intSqrt(r.n), b = intSqrt(r.d);
  return a === null || b === null ? null : new Rational(a, b);
}

export const Sets = {
  empty: () => ({ kind: 'empty' }),
  all: () => ({ kind: 'all' }),
  unsupported: reason => ({ kind: 'unsupported', reason }),
  finite(values) {
    const m = new Map();
    for (const v of values) m.set(v.key(), v);
    const sorted = [...m.values()].sort((a, b) => a.compare(b));
    return sorted.length ? { kind: 'finite', values: sorted } : { kind: 'empty' };
  }
};

export function setEqual(a, b) {
  if (a.kind === 'unsupported' || b.kind === 'unsupported') return false;
  if (a.kind !== b.kind) return a.kind === 'empty' && b.kind === 'finite' && b.values.length === 0 || b.kind === 'empty' && a.kind === 'finite' && a.values.length === 0;
  if (a.kind === 'all' || a.kind === 'empty') return true;
  return a.values.length === b.values.length && a.values.every((v, i) => v.eq(b.values[i]));
}

function contains(set, value) {
  return set.kind === 'all' || set.kind === 'finite' && set.values.some(v => v.eq(value));
}
function subset(a, b) {
  if (a.kind === 'unsupported' || b.kind === 'unsupported') return null;
  if (a.kind === 'empty' || b.kind === 'all') return true;
  if (a.kind === 'all' || b.kind === 'empty') return false;
  return a.values.every(v => contains(b, v));
}
function union(a, b) {
  if (a.kind === 'unsupported') return a;
  if (b.kind === 'unsupported') return b;
  if (a.kind === 'all' || b.kind === 'all') return Sets.all();
  if (a.kind === 'empty') return b;
  if (b.kind === 'empty') return a;
  return Sets.finite([...a.values, ...b.values]);
}

class ParseError extends Error {}

export function hasPlaceholder(latex) {
  return !latex || latex.trim() === '' || /\\placeholder|\\square|□/.test(latex);
}

function normalize(latex) {
  return latex
    .replace(/−/g, '-')
    .replace(/\\left/g, '').replace(/\\right/g, '')
    .replace(/\\lvert|\\rvert|\\vert/g, '|')
    .replace(/\\,/g, '').replace(/\\!/g, '').replace(/\\;/g, '')
    .replace(/\\quad|\\qquad/g, '')
    .replace(/\\text\s*\{\s*ou\s*\}/gi, '§')
    .replace(/\\operatorname\s*\{\s*ou\s*\}/gi, '§')
    .replace(/\\mathrm\s*\{\s*ou\s*\}/gi, '§')
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\s+/g, '');
}

function tokenize(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\d/.test(c)) {
      let j = i + 1; while (j < s.length && /\d/.test(s[j])) j++;
      out.push({ k: 'num', v: s.slice(i, j) }); i = j; continue;
    }
    const one = { x:'x', X:'x', '+':'plus', '-':'minus', '*':'star', '/':'slash', '(':'lp', ')':'rp', '{':'lb', '}':'rb', '^':'pow', '|':'bar' }[c];
    if (one) { out.push({ k: one }); i++; continue; }
    if (c === '\\') {
      const rest = s.slice(i);
      if (rest.startsWith('\\frac')) { out.push({ k:'frac' }); i += 5; continue; }
      if (rest.startsWith('\\dfrac')) { out.push({ k:'frac' }); i += 6; continue; }
      if (rest.startsWith('\\sqrt')) { out.push({ k:'sqrt' }); i += 5; continue; }
      if (rest.startsWith('\\pm')) { out.push({ k:'pm' }); i += 3; continue; }
      throw new ParseError(`Commande non prise en charge: ${rest.slice(0, 12)}`);
    }
    throw new ParseError(`Caractère non pris en charge: ${c}`);
  }
  return out;
}

class Parser {
  constructor(tokens) { this.t = tokens; this.i = 0; }
  peek() { return this.t[this.i]; }
  take() { return this.t[this.i++]; }
  match(k) { if (this.peek()?.k === k) { this.i++; return true; } return false; }
  expect(k) { const t = this.take(); if (!t || t.k !== k) throw new ParseError('Expression incomplète'); return t; }
  parse() { const e = this.add(); if (this.i !== this.t.length) throw new ParseError('Expression incomplète ou ambiguë'); return e; }
  add() {
    let e = this.mul();
    for (;;) {
      if (this.match('plus')) e = { k:'add', a:e, b:this.mul() };
      else if (this.match('minus')) e = { k:'sub', a:e, b:this.mul() };
      else break;
    }
    return e;
  }
  startsPrimary(t) { return !!t && ['num','x','lp','lb','frac','sqrt','pm'].includes(t.k); }
  mul() {
    let e = this.unary();
    for (;;) {
      if (this.match('star')) e = { k:'mul', a:e, b:this.unary() };
      else if (this.match('slash')) e = { k:'div', a:e, b:this.unary() };
      else if (this.startsPrimary(this.peek())) e = { k:'mul', a:e, b:this.unary() };
      else break;
    }
    return e;
  }
  unary() {
    if (this.match('minus')) return { k:'neg', v:this.unary() };
    if (this.match('plus')) return this.unary();
    if (this.match('pm')) return { k:'pm', v:this.unary() };
    return this.power();
  }
  power() {
    let e = this.primary();
    if (this.match('pow')) {
      if (this.match('lb')) { const n = this.expect('num'); this.expect('rb'); if (n.v !== '2') throw new ParseError('Seul le carré est pris en charge'); }
      else { const n = this.expect('num'); if (n.v !== '2') throw new ParseError('Seul le carré est pris en charge'); }
      e = { k:'square', v:e };
    }
    return e;
  }
  primary() {
    const t = this.peek(); if (!t) throw new ParseError('Expression incomplète');
    if (t.k === 'num') { this.take(); return { k:'const', v:new Rational(BigInt(t.v)) }; }
    if (t.k === 'x') { this.take(); return { k:'var' }; }
    if (t.k === 'lp') { this.take(); const e = this.add(); this.expect('rp'); return e; }
    if (t.k === 'lb') { this.take(); const e = this.add(); this.expect('rb'); return e; }
    if (t.k === 'frac') { this.take(); return { k:'div', a:this.group(), b:this.group() }; }
    if (t.k === 'sqrt') { this.take(); return { k:'sqrt', v:this.group() }; }
    if (t.k === 'bar') { this.take(); const e = this.addUntilBar(); this.expect('bar'); return { k:'abs', v:e }; }
    if (t.k === 'pm') { this.take(); return { k:'pm', v:this.unary() }; }
    throw new ParseError('Expression inattendue');
  }
  group() { this.expect('lb'); const e = this.add(); this.expect('rb'); return e; }
  addUntilBar() {
    let e = this.mul();
    while (this.peek() && this.peek().k !== 'bar') {
      if (this.match('plus')) e = { k:'add', a:e, b:this.mul() };
      else if (this.match('minus')) e = { k:'sub', a:e, b:this.mul() };
      else break;
    }
    return e;
  }
}

function parseExpr(s) { return new Parser(tokenize(s)).parse(); }
function splitEquation(s) {
  let braces = 0, parens = 0, bar = false;
  for (let i=0; i<s.length; i++) {
    const c = s[i];
    if (c === '{') braces++; else if (c === '}') braces--;
    else if (c === '(') parens++; else if (c === ')') parens--;
    else if (c === '|') bar = !bar;
    else if (c === '=' && braces === 0 && parens === 0 && !bar) {
      if (s.indexOf('=', i+1) !== -1) throw new ParseError('Une seule égalité est attendue');
      return [s.slice(0,i), s.slice(i+1)];
    }
  }
  throw new ParseError('Une égalité est attendue');
}

export function parseLine(latex) {
  if (hasPlaceholder(latex)) throw new ParseError('Expression incomplète');
  const normalized = normalize(latex);
  const parts = normalized.split('§').filter(Boolean);
  if (!parts.length) throw new ParseError('Expression vide');
  return parts.map(p => {
    const [l,r] = splitEquation(p);
    if (!l || !r) throw new ParseError('Égalité incomplète');
    return { left:parseExpr(l), right:parseExpr(r) };
  });
}

function constValue(e) {
  if (e.k === 'const') return e.v;
  if (e.k === 'var' || e.k === 'pm') return null;
  if (e.k === 'neg') { const v = constValue(e.v); return v ? v.neg() : null; }
  if (e.k === 'square') { const v = constValue(e.v); return v ? v.square() : null; }
  if (e.k === 'sqrt') { const v = constValue(e.v); return v ? sqrtRational(v) : null; }
  if (e.k === 'abs') { const v = constValue(e.v); return v ? v.abs() : null; }
  const a = constValue(e.a), b = constValue(e.b);
  if (!a || !b) return null;
  if (e.k === 'add') return a.add(b);
  if (e.k === 'sub') return a.sub(b);
  if (e.k === 'mul') return a.mul(b);
  if (e.k === 'div') return b.isZero() ? null : a.div(b);
  return null;
}

function trimPoly(p) { const q=[...p]; while(q.length>1 && q.at(-1).isZero()) q.pop(); return q; }
function degree(p) { return trimPoly(p).length - 1; }
function polyAdd(a,b) { const n=Math.max(a.length,b.length), r=[]; for(let i=0;i<n;i++) r.push((a[i]||Rational.ZERO).add(b[i]||Rational.ZERO)); return trimPoly(r); }
function polyNeg(a) { return trimPoly(a.map(v=>v.neg())); }
function polySub(a,b) { return polyAdd(a,polyNeg(b)); }
function polyMul(a,b) { const r=Array.from({length:a.length+b.length-1},()=>Rational.ZERO); for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) r[i+j]=r[i+j].add(a[i].mul(b[j])); return trimPoly(r); }
function polyEval(p,x) { let y=Rational.ZERO; for(let i=p.length-1;i>=0;i--) y=y.mul(x).add(p[i]); return y; }

function containsX(e) {
  if (e.k === 'var') return true;
  if (e.k === 'const') return false;
  if (['neg','square','sqrt','abs','pm'].includes(e.k)) return containsX(e.v);
  return containsX(e.a) || containsX(e.b);
}

function toPoly(e) {
  if (e.k === 'const') return [e.v];
  if (e.k === 'var') return [Rational.ZERO,Rational.ONE];
  if (e.k === 'neg') { const p=toPoly(e.v); return p && polyNeg(p); }
  if (e.k === 'add' || e.k === 'sub' || e.k === 'mul') {
    const a=toPoly(e.a), b=toPoly(e.b); if(!a||!b) return null;
    const p=e.k==='add'?polyAdd(a,b):e.k==='sub'?polySub(a,b):polyMul(a,b);
    return degree(p)<=2?p:null;
  }
  if (e.k === 'div') {
    if (containsX(e.b)) return null;
    const d=constValue(e.b); if(!d || d.isZero()) return null;
    const p=toPoly(e.a); return p ? p.map(v=>v.div(d)) : null;
  }
  if (e.k === 'square') { const p=toPoly(e.v); if(!p) return null; const q=polyMul(p,p); return degree(q)<=2?q:null; }
  return null;
}

function divisors(n) {
  n=absBig(n); if(n===0n) return [0n]; const out=[];
  for(let i=1n;i*i<=n;i++) if(n%i===0n){out.push(i); if(i*i!==n) out.push(n/i);}
  return out;
}
function rationalCandidates(p) {
  let common=1n; for(const c of p) common=lcm(common,c.d);
  const ints=p.map(c=>c.n*(common/c.d));
  const c0=ints[0], lead=ints.at(-1);
  if(c0===0n) return [Rational.ZERO];
  const m=new Map();
  for(const a of divisors(c0)) for(const b of divisors(lead)) if(b) for(const sign of [1n,-1n]) { const r=new Rational(sign*a,b); m.set(r.key(),r); }
  return [...m.values()];
}
function syntheticDivide(p, root) {
  p=trimPoly(p); if(degree(p)<1 || !polyEval(p,root).isZero()) return null;
  const n=degree(p), q=Array.from({length:n},()=>Rational.ZERO);
  q[n-1]=p[n];
  for(let i=n-2;i>=0;i--) q[i]=p[i+1].add(root.mul(q[i+1]));
  return trimPoly(q);
}
function solvePoly(p) {
  p=trimPoly(p); const d=degree(p);
  if(d===0) return p[0].isZero()?Sets.all():Sets.empty();
  if(d===1) return Sets.finite([p[0].neg().div(p[1])]);
  if(d!==2) return Sets.unsupported('Degré non pris en charge');
  if(p[0].isZero()) return Sets.finite([Rational.ZERO,p[1].neg().div(p[2])]);
  for(const r of rationalCandidates(p)) {
    if (!polyEval(p,r).isZero()) continue;
    const q=syntheticDivide(p,r); if(!q) continue;
    const other=solvePoly(q);
    if(other.kind==='finite') return Sets.finite([r,...other.values]);
  }
  return Sets.unsupported('Équation non factorisable avec les méthodes de 3ème');
}

function sameAst(a,b) {
  if(a.k!==b.k) return false;
  if(a.k==='const') return a.v.eq(b.v);
  if(a.k==='var') return true;
  if(['neg','square','sqrt','abs','pm'].includes(a.k)) return sameAst(a.v,b.v);
  return sameAst(a.a,b.a)&&sameAst(a.b,b.b);
}

function solveEquation({left,right}) {
  if (sameAst(left,right)) return Sets.all();
  if (left.k==='pm') return union(solveEquation({left:left.v,right}),solveEquation({left:{k:'neg',v:left.v},right}));
  if (right.k==='pm') return union(solveEquation({left,right:right.v}),solveEquation({left,right:{k:'neg',v:right.v}}));
  if (left.k==='abs') {
    const c=constValue(right); if(!c) return Sets.unsupported('Valeur absolue seulement face à une constante');
    if(c.isNegative()) return Sets.empty();
    return union(solveEquation({left:left.v,right:{k:'const',v:c}}),solveEquation({left:left.v,right:{k:'const',v:c.neg()}}));
  }
  if (right.k==='abs') return solveEquation({left:right,right:left});
  if (left.k==='sqrt') {
    const c=constValue(right); if(!c) return Sets.unsupported('Racine carrée seulement face à une constante');
    if(c.isNegative()) return Sets.empty();
    return solveEquation({left:left.v,right:{k:'const',v:c.square()}});
  }
  if (right.k==='sqrt') return solveEquation({left:right,right:left});
  const a=toPoly(left), b=toPoly(right);
  if(!a||!b) return Sets.unsupported('Écriture hors programme de cette application');
  return solvePoly(polySub(a,b));
}

export function analyze(latex) {
  try {
    const equations=parseLine(latex);
    let set=Sets.empty();
    for(const eq of equations) set=union(set,solveEquation(eq));
    return set.kind==='unsupported'?{kind:'unsupported',message:set.reason}:{kind:'ok',set};
  } catch(e) {
    return {kind:'incomplete',message:e instanceof Error?e.message:'Expression incomplète'};
  }
}

export function compareSteps(previous, next) {
  const a=analyze(previous), b=analyze(next);
  if(a.kind!=='ok') return {kind:'source-error'};
  if(b.kind!=='ok') return {kind:b.kind};
  if(setEqual(a.set,b.set)) return {kind:'equivalent',set:b.set};
  const bInA=subset(b.set,a.set), aInB=subset(a.set,b.set);
  if(bInA===true && aInB!==true) return {kind:'lost-solutions'};
  if(aInB===true && bInA!==true) return {kind:'added-solutions'};
  return {kind:'not-equivalent'};
}

function isConstExpr(e) { return !containsX(e); }
function isTerminalEquation(eq) {
  return eq.left.k==='var' && isConstExpr(eq.right) || eq.right.k==='var' && isConstExpr(eq.left);
}
export function isTerminal(latex) {
  try { return parseLine(latex).every(isTerminalEquation); } catch { return false; }
}

export function validateChain(prompt, rows) {
  let previous=prompt;
  for(let i=0;i<rows.length;i++) {
    const row=rows[i]?.trim()||'';
    if(!row || hasPlaceholder(row)) return {kind:'incomplete',row:i,message:'Expression incomplète.'};
    const c=compareSteps(previous,row);
    if(c.kind==='incomplete' || c.kind==='unsupported') return {kind:'incomplete',row:i,message:c.kind==='unsupported'?'Cette écriture est hors programme de cette application.':'Expression incomplète.'};
    if(c.kind==='lost-solutions') return {kind:'error',row:i,message:'Tu as perdu une ou plusieurs solutions.'};
    if(c.kind==='added-solutions') return {kind:'error',row:i,message:'Tu as ajouté une ou plusieurs solutions.'};
    if(c.kind!=='equivalent') return {kind:'error',row:i,message:'Cette étape n’est pas équivalente à la précédente.'};
    previous=row;
  }
  const last=rows.at(-1)?.trim()||'';
  return last && isTerminal(last) ? {kind:'success'} : {kind:'continue',message:'Correct jusqu’ici. Continue la résolution.'};
}
