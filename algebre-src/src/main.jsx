import { h, Fragment, render } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';
import './styles.css';
import { analyze, setEqual, validateChain } from './math.js';
import { CATEGORIES, CATEGORY_INFO, generateExercise, randomSeed } from './exercises.js';

MathfieldElement.soundsDirectory = null;
MathfieldElement.keypressVibration = false;

const STORAGE_KEY='algebre-3eme-session-v2';
const MAX_ROWS=20;

function loadSession(){
  try{
    const x=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!x||!CATEGORIES.includes(x.category)||!Number.isFinite(x.seed)||!Array.isArray(x.rows)||!x.rows.length) return null;
    return {category:x.category,seed:x.seed>>>0,rows:x.rows.slice(0,MAX_ROWS).map(String)};
  }catch{return null;}
}
function saveSession(s){ try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s));}catch{} }
function clearSession(){ try{localStorage.removeItem(STORAGE_KEY);}catch{} }

function StaticMath({latex,className=''}){
  return <math-span class={className} aria-hidden="true">{latex}</math-span>;
}

function Home({onChoose,onResume}){
  const saved=loadSession();
  return <main class="home-screen">
    <header class="home-header"><h1>Algèbre</h1><p>Choisis ce que tu veux pratiquer.</p></header>
    {saved&&<button class="resume-card" type="button" onClick={onResume}><span>Reprendre</span><strong>{CATEGORY_INFO[saved.category].title}</strong></button>}
    <div class="category-list">
      {CATEGORIES.map(cat=><button key={cat} type="button" class={`category-button ${cat==='mixed'?'category-button--mixed':''}`} onClick={()=>onChoose(cat)}>
        <span class="category-copy"><strong>{CATEGORY_INFO[cat].title}</strong><StaticMath latex={CATEGORY_INFO[cat].formula} className="category-formula"/></span><span class="category-chevron" aria-hidden="true">›</span>
      </button>)}
    </div>
  </main>;
}

function configureField(mf){
  if(!mf)return;
  mf.mathVirtualKeyboardPolicy='manual';
  mf.defaultMode='math';
  mf.smartMode=false;
  mf.smartFence=false;
  mf.smartSuperscript=true;
  mf.removeExtraneousParentheses=false;
  mf.popoverPolicy='off';
  mf.scriptDepth=[0,1];
  mf.placeholderSymbol='□';
}

function MathRow({row,index,isInvalid,isIncomplete,onValue,onFocus,onDirectPointer,onEnter,onDeleteEmpty,register}){
  const ref=useRef(null);
  useEffect(()=>{
    const mf=ref.current; if(!mf)return;
    configureField(mf); register(row.id,mf);
    if(mf.value!==row.value) mf.value=row.value;
    return()=>register(row.id,null);
  },[row.id]);
  useEffect(()=>{const mf=ref.current;if(mf&&mf.value!==row.value)mf.value=row.value;},[row.value]);
  const keydown=e=>{
    if(e.key==='Enter'){e.preventDefault();e.stopPropagation();onEnter(row.id);return;}
    if(e.key==='Backspace'&&e.currentTarget.value.trim()===''&&onDeleteEmpty(row.id)){e.preventDefault();e.stopPropagation();}
  };
  return <div class={`math-row ${isInvalid?'math-row--invalid':''} ${isIncomplete?'math-row--incomplete':''}`}>
    <span class="equiv" aria-hidden="true">⇔</span>
    <math-field ref={ref} aria-label={`Étape ${index+1}`} onInput={e=>onValue(row.id,e.currentTarget.value)} onFocus={e=>onFocus(row.id,e.currentTarget)} onPointerDown={onDirectPointer} onKeyDown={keydown}/>
    <span class="row-mark" aria-label={isInvalid?'Erreur':undefined}>{isInvalid?'×':''}</span>
  </div>;
}

function Prompt({latex}){ return <div class="prompt-row"><span class="equiv equiv--hidden">⇔</span><StaticMath latex={`\\displaystyle ${latex}`} className="prompt-math"/><span class="row-mark"/></div>; }

const KEY_LABELS={
  times:'\\times',x:'x',square:'{}^{2}',pm:'\\pm',parentheses:'(\\square)',sqrt:'\\sqrt{\\square}',fraction:'\\dfrac{\\square}{\\square}',abs:'|\\square|'
};
function Key({dataKey,label,math=true,className='',onClick,ariaLabel}){
  return <button type="button" data-key={dataKey} aria-label={ariaLabel} class={`key ${math?'key--math':''} ${className}`} onPointerDown={e=>e.preventDefault()} onClick={onClick}>{math?<StaticMath latex={label}/>:label}</button>;
}

function MathKeyboard({field,selectionMode,setSelectionMode,onEnter,onDeleteEmpty}){
  const insert=(latex,opts={})=>{
    if(!field)return;
    field.insert(latex,{insertionMode:'replaceSelection',selectionMode:'after',mode:'math',focus:true,...opts});
    field.mode='math'; field.focus(); setSelectionMode(false);
  };
  const structure=(kind)=>{
    if(!field)return;
    const map={fraction:'\\frac{#0}{#?}',sqrt:'\\sqrt{#0}',parentheses:'\\left(#0\\right)',abs:'\\left|#0\\right|'};
    field.insert(map[kind],{insertionMode:'replaceSelection',selectionMode:'placeholder',mode:'math',focus:true});
    field.mode='math'; field.focus(); setSelectionMode(false);
  };
  const square=()=>{
    if(!field)return;
    field.insert('#@^{2}',{insertionMode:'replaceSelection',selectionMode:'after',mode:'math',focus:true});
    field.mode='math';field.focus();setSelectionMode(false);
  };
  const move=dir=>{
    if(!field)return;
    const cmd=dir==='left'?(selectionMode?'extendSelectionBackward':'moveToPreviousChar'):dir==='right'?(selectionMode?'extendSelectionForward':'moveToNextChar'):dir==='up'?'moveUp':'moveDown';
    field.executeCommand(cmd); field.focus();
  };
  const erase=()=>{
    if(onDeleteEmpty())return;
    if(field){field.executeCommand('deleteBackward');field.focus();}
    setSelectionMode(false);
  };
  const enter=()=>{onEnter();setSelectionMode(false);};
  const textOr=()=>{
    if(!field)return;
    field.insert('\\text{ ou }',{insertionMode:'replaceSelection',selectionMode:'after',mode:'math',focus:true});
    field.mode='math';field.focus();setSelectionMode(false);
  };
  return <div class="keyboard" aria-label="Clavier mathématique">
    <div class="key-grid">
      {[7,8,9].map(n=><Key key={n} dataKey={`${n}`} label={`${n}`} onClick={()=>insert(`${n}`)}/>)}
      <Key dataKey="plus" label="+" ariaLabel="Plus" onClick={()=>insert('+')}/><Key dataKey="minus" label="-" ariaLabel="Moins" onClick={()=>insert('-')}/><Key dataKey="times" label={KEY_LABELS.times} ariaLabel="Multiplier" onClick={()=>insert('\\times')}/>
      {[4,5,6].map(n=><Key key={n} dataKey={`${n}`} label={`${n}`} onClick={()=>insert(`${n}`)}/>)}
      <Key dataKey="x" label={KEY_LABELS.x} ariaLabel="x" onClick={()=>insert('x')}/><Key dataKey="square" label={KEY_LABELS.square} ariaLabel="Carré" onClick={square}/><Key dataKey="equals" label="=" ariaLabel="Égal" onClick={()=>insert('=')}/>
      {[1,2,3].map(n=><Key key={n} dataKey={`${n}`} label={`${n}`} onClick={()=>insert(`${n}`)}/>)}
      <Key dataKey="pm" label={KEY_LABELS.pm} ariaLabel="Plus ou moins" onClick={()=>insert('\\pm')}/><Key dataKey="parentheses" label={KEY_LABELS.parentheses} ariaLabel="Parenthèses" onClick={()=>structure('parentheses')}/><Key dataKey="sqrt" label={KEY_LABELS.sqrt} ariaLabel="Racine carrée" onClick={()=>structure('sqrt')}/>
      <Key dataKey="0" label="0" onClick={()=>insert('0')}/><Key dataKey="fraction" label={KEY_LABELS.fraction} ariaLabel="Fraction" onClick={()=>structure('fraction')}/><Key dataKey="abs" label={KEY_LABELS.abs} ariaLabel="Valeur absolue" onClick={()=>structure('abs')}/>
      <Key dataKey="or" label="ou" math={false} className="key--word" ariaLabel="ou" onClick={textOr}/><Key dataKey="up" label="↑" math={false} className="key--nav" ariaLabel="Monter" onClick={()=>move('up')}/><Key dataKey="down" label="↓" math={false} className="key--nav" ariaLabel="Descendre" onClick={()=>move('down')}/>
    </div>
    <div class="key-bottom-row">
      <Key dataKey="select" label="Sélection" math={false} className={`key--select ${selectionMode?'key--active':''}`} ariaLabel="Mode sélection" onClick={()=>setSelectionMode(v=>!v)}/>
      <Key dataKey="left" label="←" math={false} className="key--nav" ariaLabel="Déplacer à gauche" onClick={()=>move('left')}/>
      <Key dataKey="right" label="→" math={false} className="key--nav" ariaLabel="Déplacer à droite" onClick={()=>move('right')}/>
      <Key dataKey="backspace" label="⌫" math={false} className="key--backspace" ariaLabel="Effacer" onClick={erase}/>
      <Key dataKey="enter" label="Entrée" math={false} className="key--enter" ariaLabel="Nouvelle ligne" onClick={enter}/>
    </div>
  </div>;
}

function Correction({exercise}){
  return <div class="correction-block"><div class="correction-title">Une correction possible</div><div class="correction-math">
    <div class="correction-row correction-row--prompt"><span class="equiv equiv--hidden">⇔</span><StaticMath latex={`\\displaystyle ${exercise.promptLatex}`}/></div>
    {exercise.correctionLatex.map((line,i)=><div class="correction-row" key={`${line}-${i}`}><span class="equiv">⇔</span><StaticMath latex={`\\displaystyle ${line}`}/></div>)}
  </div></div>;
}

function Practice({category,seed:initialSeed,initialRows,onBack}){
  const [seed,setSeed]=useState(initialSeed>>>0);
  const [rows,setRows]=useState(()=>initialRows.map((value,id)=>({id,value})));
  const [activeId,setActiveId]=useState(rows[0]?.id??0);
  const [activeField,setActiveField]=useState(null);
  const [feedback,setFeedback]=useState({kind:'editing'});
  const [showCorrection,setShowCorrection]=useState(false);
  const [selectionMode,setSelectionMode]=useState(false);
  const [recent,setRecent]=useState([initialSeed>>>0]);
  const nextId=useRef(Math.max(1,...rows.map(r=>r.id+1)));
  const fields=useRef(new Map());
  const exercise=useMemo(()=>generateExercise(category,seed),[category,seed]);

  useEffect(()=>saveSession({category,seed,rows:rows.map(r=>r.value)}),[category,seed,rows]);
  useEffect(()=>{requestAnimationFrame(()=>{const mf=fields.current.get(activeId);if(mf){setActiveField(mf);if(!mf.hasFocus())mf.focus();}});},[seed]);

  const register=(id,mf)=>{
    if(mf){fields.current.set(id,mf);if(id===activeId)setActiveField(mf);}
    else{fields.current.delete(id);if(id===activeId)setActiveField(null);}
  };
  const edit=(id,value)=>{setRows(old=>old.map(r=>r.id===id?{...r,value}:r));setFeedback({kind:'editing'});setShowCorrection(false);};
  const focus=(id,mf)=>{setActiveId(id);setActiveField(mf);configureField(mf);};
  const directPointer=()=>setSelectionMode(false);
  const addAfter=(id=activeId)=>{
    if(rows.length>=MAX_ROWS)return;
    const at=rows.findIndex(r=>r.id===id),pos=at<0?rows.length:at+1,newId=nextId.current++;
    setRows(old=>[...old.slice(0,pos),{id:newId,value:''},...old.slice(pos)]);setActiveId(newId);setActiveField(null);setSelectionMode(false);setFeedback({kind:'editing'});
    requestAnimationFrame(()=>fields.current.get(newId)?.focus());
  };
  const deleteEmpty=id=>{
    if(rows.length<=1)return false;
    const at=rows.findIndex(r=>r.id===id);if(at<0||rows[at].value.trim()!=='')return false;
    const target=rows[Math.max(0,at-1)];
    setRows(old=>old.filter(r=>r.id!==id));setActiveId(target.id);setActiveField(null);setSelectionMode(false);setFeedback({kind:'editing'});
    requestAnimationFrame(()=>{const mf=fields.current.get(target.id);if(mf){setActiveField(mf);mf.focus();mf.executeCommand('moveToMathfieldEnd');}});return true;
  };
  const verify=()=>setFeedback(validateChain(exercise.promptLatex,rows.map(r=>r.value)));
  const next=()=>{
    let s=randomSeed(),guard=0; while(recent.includes(s)&&guard++<30)s=randomSeed();
    const id=nextId.current++;
    setRecent(x=>[...x.slice(-7),s]);setSeed(s);setRows([{id,value:''}]);setActiveId(id);setActiveField(null);setFeedback({kind:'editing'});setShowCorrection(false);setSelectionMode(false);
  };
  const invalid=feedback.kind==='error'?feedback.row:-1, incomplete=feedback.kind==='incomplete'?feedback.row:-1;
  const success=feedback.kind==='success';

  return <main class="practice-screen">
    <header class="practice-header"><button type="button" class="back-button" aria-label="Retour aux catégories" onClick={onBack}>‹</button><div class="practice-category">{CATEGORY_INFO[category].title}</div><div class="header-spacer"/></header>
    <section class="workspace" aria-label="Résolution"><Prompt latex={exercise.promptLatex}/><div class="student-rows">
      {rows.map((row,i)=><MathRow key={row.id} row={row} index={i} isInvalid={i===invalid} isIncomplete={i===incomplete} onValue={edit} onFocus={focus} onDirectPointer={directPointer} onEnter={addAfter} onDeleteEmpty={deleteEmpty} register={register}/>) }
    </div></section>
    {!success&&<div class="practice-controls"><button type="button" class="verify-button" onClick={verify}>Vérifier</button></div>}
    <div class="feedback" aria-live="polite">
      {feedback.kind==='error'&&<div class="feedback-message feedback-message--error">{feedback.message}</div>}
      {(feedback.kind==='incomplete'||feedback.kind==='continue')&&<div class="feedback-message feedback-message--neutral">{feedback.message}</div>}
      {success&&<div class="success-panel"><div class="feedback-message feedback-message--success">Correct.</div><button type="button" class="next-button" onClick={next}>Exercice suivant</button></div>}
      {!success&&['error','incomplete','continue'].includes(feedback.kind)&&<button type="button" class="correction-toggle" onClick={()=>setShowCorrection(v=>!v)}>{showCorrection?'Masquer la correction':'Voir une correction'}</button>}
    </div>
    {showCorrection&&<Correction exercise={exercise}/>} 
    {!success&&<MathKeyboard field={activeField} selectionMode={selectionMode} setSelectionMode={setSelectionMode} onEnter={()=>addAfter(activeId)} onDeleteEmpty={()=>deleteEmpty(activeId)}/>} 
  </main>;
}

function App(){
  const [screen,setScreen]=useState({kind:'home'});
  if(screen.kind==='practice') return <Practice category={screen.category} seed={screen.seed} initialRows={screen.rows} onBack={()=>setScreen({kind:'home'})}/>;
  return <Home onChoose={category=>{clearSession();setScreen({kind:'practice',category,seed:randomSeed(),rows:['']});}} onResume={()=>{const s=loadSession();if(s)setScreen({kind:'practice',...s});}}/>;
}

render(<App/>,document.getElementById('app'));

if(import.meta.env.DEV || location.hostname==='127.0.0.1' || location.hostname==='localhost'){
  window.__ALGEBRE_TEST__={analyze,setEqual,generateExercise};
}
