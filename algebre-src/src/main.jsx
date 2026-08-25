import { h, render } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';
import './styles.css';
import './trainer/trainer.css';
import { analyze, setEqual } from './math.js';
import { EQUATIONS_3EME_PACK } from './packs/equations3eme.js';
import {
  createDerivationRow,
  cycleRelation,
  hydrateDerivationRows,
  serializeDerivationRows
} from './trainer/core.js';
import { DerivationEditor, RelationMark } from './trainer/DerivationEditor.jsx';
import { MathKeyboard } from './trainer/MathKeyboard.jsx';
import { StaticMath, configureMathField } from './trainer/MathView.jsx';

MathfieldElement.soundsDirectory = null;
MathfieldElement.keypressVibration = false;

const PACK=EQUATIONS_3EME_PACK;
const CATEGORIES=PACK.categories;
const CATEGORY_INFO=PACK.categoryInfo;
const WORKSPACE=PACK.workspace;
const STORAGE_KEY=`math-trainer-${PACK.id}-session-v${PACK.version}`;
const LEGACY_STORAGE_KEYS=['algebre-3eme-session-v3','algebre-3eme-session-v2'];
const MAX_ROWS=20;

function loadSession(){
  for(const key of [STORAGE_KEY,...LEGACY_STORAGE_KEYS]){
    try{
      const x=JSON.parse(localStorage.getItem(key));
      if(!x||!CATEGORIES.includes(x.category)||!Number.isFinite(x.seed)||!Array.isArray(x.rows)||!x.rows.length) continue;
      const rows=serializeDerivationRows(hydrateDerivationRows(x.rows.slice(0,MAX_ROWS),WORKSPACE));
      return {category:x.category,seed:x.seed>>>0,rows};
    }catch{}
  }
  return null;
}
function saveSession(s){ try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s));}catch{} }
function clearSession(){
  for(const key of [STORAGE_KEY,...LEGACY_STORAGE_KEYS]){
    try{localStorage.removeItem(key);}catch{}
  }
}

function Home({onChoose,onResume}){
  const saved=loadSession();
  return <main class="home-screen">
    <header class="home-header"><h1>{PACK.title}</h1><p>Choisis ce que tu veux pratiquer.</p></header>
    {saved&&<button class="resume-card" type="button" onClick={onResume}><span>Reprendre</span><strong>{CATEGORY_INFO[saved.category].title}</strong></button>}
    <div class="category-list">
      {CATEGORIES.map(cat=><button key={cat} type="button" class={`category-button ${cat==='mixed'?'category-button--mixed':''}`} onClick={()=>onChoose(cat)}>
        <span class="category-copy"><strong>{CATEGORY_INFO[cat].title}</strong><StaticMath latex={CATEGORY_INFO[cat].formula} className="category-formula"/></span><span class="category-chevron" aria-hidden="true">›</span>
      </button>)}
    </div>
  </main>;
}

function Correction({exercise,workspace}){
  return <div class="correction-block"><div class="correction-title">Une correction possible</div><div class="correction-math">
    <div class="correction-row correction-row--prompt"><RelationMark relation={workspace.defaultRelation} workspace={workspace} hidden/><StaticMath latex={`\\displaystyle ${exercise.promptLatex}`}/></div>
    {exercise.correctionLatex.map((line,i)=><div class="correction-row" key={`${line}-${i}`}><RelationMark relation={exercise.correctionRelations?.[i]||workspace.defaultRelation} workspace={workspace}/><StaticMath latex={`\\displaystyle ${line}`}/></div>)}
  </div></div>;
}

function Practice({category,seed:initialSeed,initialRows,onBack}){
  const workspace=WORKSPACE;
  const [seed,setSeed]=useState(initialSeed>>>0);
  const [rows,setRows]=useState(()=>hydrateDerivationRows(initialRows,workspace));
  const [activeId,setActiveId]=useState(rows[0]?.id??0);
  const [activeField,setActiveField]=useState(null);
  const [feedback,setFeedback]=useState({kind:'editing'});
  const [showCorrection,setShowCorrection]=useState(false);
  const [selectionMode,setSelectionMode]=useState(false);
  const [recent,setRecent]=useState([initialSeed>>>0]);
  const nextId=useRef(Math.max(1,...rows.map(r=>r.id+1)));
  const fields=useRef(new Map());
  const exercise=useMemo(()=>PACK.generateExercise(category,seed),[category,seed]);

  useEffect(()=>saveSession({category,seed,rows:serializeDerivationRows(rows)}),[category,seed,rows]);
  useEffect(()=>{requestAnimationFrame(()=>{const mf=fields.current.get(activeId);if(mf){setActiveField(mf);if(!mf.hasFocus())mf.focus();}});},[seed]);

  const register=(id,mf)=>{
    if(mf){fields.current.set(id,mf);if(id===activeId)setActiveField(mf);}
    else{fields.current.delete(id);if(id===activeId)setActiveField(null);}
  };
  const edit=(id,value)=>{setRows(old=>old.map(r=>r.id===id?{...r,value}:r));setFeedback({kind:'editing'});setShowCorrection(false);};
  const focus=(id,mf)=>{setActiveId(id);setActiveField(mf);configureMathField(mf);};
  const directPointer=()=>setSelectionMode(false);
  const changeRelation=id=>{
    if(workspace.relationMode!=='student')return;
    setRows(old=>old.map(row=>row.id===id?{...row,relationBefore:cycleRelation(row.relationBefore,workspace)}:row));
    setFeedback({kind:'editing'});setShowCorrection(false);
  };
  const setActiveRelation=relation=>{
    if(workspace.relationMode!=='student'||!workspace.allowedRelations.includes(relation))return;
    setRows(old=>old.map(row=>row.id===activeId?{...row,relationBefore:relation}:row));
    setFeedback({kind:'editing'});setShowCorrection(false);
  };
  const addAfter=(id=activeId)=>{
    if(rows.length>=MAX_ROWS)return;
    const at=rows.findIndex(r=>r.id===id),pos=at<0?rows.length:at+1,newId=nextId.current++;
    setRows(old=>[...old.slice(0,pos),createDerivationRow(newId,'',workspace),...old.slice(pos)]);setActiveId(newId);setActiveField(null);setSelectionMode(false);setFeedback({kind:'editing'});
    requestAnimationFrame(()=>fields.current.get(newId)?.focus());
  };
  const deleteEmpty=id=>{
    if(rows.length<=1)return false;
    const at=rows.findIndex(r=>r.id===id);if(at<0||rows[at].value.trim()!=='')return false;
    const target=rows[Math.max(0,at-1)];
    setRows(old=>old.filter(r=>r.id!==id));setActiveId(target.id);setActiveField(null);setSelectionMode(false);setFeedback({kind:'editing'});
    requestAnimationFrame(()=>{const mf=fields.current.get(target.id);if(mf){setActiveField(mf);mf.focus();mf.executeCommand('moveToMathfieldEnd');}});return true;
  };
  const verify=()=>setFeedback(PACK.validateExercise(exercise,rows));
  const next=()=>{
    let s=PACK.nextSeed(),guard=0;
    while((recent.includes(s)||PACK.generateExercise(category,s).promptLatex===exercise.promptLatex)&&guard++<50)s=PACK.nextSeed();
    const id=nextId.current++;
    setRecent(x=>[...x.slice(-7),s]);setSeed(s);setRows([createDerivationRow(id,'',workspace)]);setActiveId(id);setActiveField(null);setFeedback({kind:'editing'});setShowCorrection(false);setSelectionMode(false);
  };
  const invalid=feedback.kind==='error'?feedback.row:-1, incomplete=feedback.kind==='incomplete'?feedback.row:-1;
  const success=feedback.kind==='success';

  return <main class="practice-screen">
    <header class="practice-header"><button type="button" class="back-button" aria-label="Retour aux catégories" onClick={onBack}>‹</button><div class="practice-category">{CATEGORY_INFO[category].title}</div><div class="header-spacer"/></header>
    <DerivationEditor
      promptKey={`${seed}:${exercise.promptLatex}`}
      promptLatex={exercise.promptLatex}
      rows={rows}
      workspace={workspace}
      invalidRow={invalid}
      incompleteRow={incomplete}
      onValue={edit}
      onFocus={focus}
      onDirectPointer={directPointer}
      onEnter={addAfter}
      onDeleteEmpty={deleteEmpty}
      onRelationChange={changeRelation}
      register={register}
    />
    {!success&&<div class="practice-controls"><button type="button" class="verify-button" onClick={verify}>Vérifier</button></div>}
    <div class="feedback" aria-live="polite">
      {feedback.kind==='error'&&<div class="feedback-message feedback-message--error">{feedback.message}</div>}
      {(feedback.kind==='incomplete'||feedback.kind==='continue')&&<div class="feedback-message feedback-message--neutral">{feedback.message}</div>}
      {success&&<div class="success-panel"><div class="feedback-message feedback-message--success">Correct.</div><button type="button" class="next-button" onClick={next}>Exercice suivant</button></div>}
      {!success&&['error','incomplete','continue'].includes(feedback.kind)&&<button type="button" class="correction-toggle" onClick={()=>setShowCorrection(v=>!v)}>{showCorrection?'Masquer la correction':'Voir une correction'}</button>}
    </div>
    {showCorrection&&<Correction exercise={exercise} workspace={workspace}/>} 
    {!success&&<MathKeyboard field={activeField} selectionMode={selectionMode} setSelectionMode={setSelectionMode} onEnter={()=>addAfter(activeId)} onDeleteEmpty={()=>deleteEmpty(activeId)} onSetRelation={setActiveRelation} keyboardConfig={PACK.keyboard}/>} 
  </main>;
}

function App(){
  const [screen,setScreen]=useState({kind:'home'});
  if(screen.kind==='practice') return <Practice category={screen.category} seed={screen.seed} initialRows={screen.rows} onBack={()=>setScreen({kind:'home'})}/>;
  return <Home onChoose={category=>{clearSession();setScreen({kind:'practice',category,seed:PACK.nextSeed(),rows:[{value:'',relationBefore:WORKSPACE.defaultRelation}]});}} onResume={()=>{const s=loadSession();if(s)setScreen({kind:'practice',...s});}}/>;
}

render(<App/>,document.getElementById('app'));

if(import.meta.env.DEV || location.hostname==='127.0.0.1' || location.hostname==='localhost'){
  window.__ALGEBRE_TEST__={analyze,setEqual,generateExercise:PACK.generateExercise,pack:PACK};
}
