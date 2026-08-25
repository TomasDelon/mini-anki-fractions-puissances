import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createDerivationRow, cycleRelation, hydrateDerivationRows, serializeDerivationRows } from './core.js';
import { completionHintCost, createHintSequence, revealHintCount, visibleHints } from './hints.js';
import { resolveExerciseKeyboard, resolveExerciseWorkspace } from './pack.js';
import { categoryMastery, createProgressStore } from './progress.js';
import { recentExerciseEntry, selectNextExercise } from './scheduler.js';
import { DerivationEditor, RelationMark } from './DerivationEditor.jsx';
import { MathKeyboard } from './MathKeyboard.jsx';
import { StaticMath, configureMathField } from './MathView.jsx';
import { createSessionStore } from './session.js';

function CategoryProgress({pack,progress,category}){
  const estimate=categoryMastery(pack,progress,category);
  if(!estimate)return null;
  const percent=Math.max(1,Math.min(100,Math.round(estimate.mastery*100)));
  return <span class="category-progress" aria-label={`Progression estimée : ${percent} %`}>
    <span class="category-progress-track" aria-hidden="true"><span class="category-progress-fill" style={{width:`${percent}%`}}/></span>
    <span class="category-progress-value" aria-hidden="true">{percent}%</span>
  </span>;
}

function TrainerHome({pack,sessionStore,progressStore,onChoose,onResume}){
  const saved=sessionStore.load();
  const progress=progressStore.load();
  return <main class="home-screen" data-pack={pack.id}>
    <header class="home-header"><h1>{pack.title}</h1><p>{pack.ui?.homePrompt||'Choisis ce que tu veux pratiquer.'}</p></header>
    {saved&&<button class="resume-card" type="button" onClick={onResume}><span>{pack.ui?.resumeLabel||'Reprendre'}</span><strong>{pack.categoryInfo[saved.category].title}</strong></button>}
    <div class="category-list">
      {pack.categories.map(category=><button key={category} type="button" class={`category-button ${category===pack.training?.mixedCategory?'category-button--mixed':''}`} onClick={()=>onChoose(category)}>
        <span class="category-copy"><strong>{pack.categoryInfo[category].title}</strong><StaticMath latex={pack.categoryInfo[category].formula} className="category-formula"/><CategoryProgress pack={pack} progress={progress} category={category}/></span><span class="category-chevron" aria-hidden="true">›</span>
      </button>)}
    </div>
  </main>;
}

function HintPanel({hints}){
  if(!hints.length)return null;
  return <div class="hint-panel" aria-live="polite">
    {hints.map(hint=><div class={`hint-item hint-item--${hint.kind}`} key={hint.id}>
      <div class="hint-title">{hint.title}</div>
      {hint.kind==='math'?<StaticMath latex={`\\displaystyle ${hint.latex}`} className="hint-math"/>:<div class="hint-text">{hint.text}</div>}
    </div>)}
  </div>;
}

function Correction({exercise,workspace,pack}){
  return <div class="correction-block"><div class="correction-title">{pack.ui?.correctionTitle||'Une correction possible'}</div><div class="correction-math">
    <div class="correction-row correction-row--prompt"><RelationMark relation={workspace.defaultRelation} workspace={workspace} hidden/><StaticMath latex={`\\displaystyle ${exercise.promptLatex}`}/></div>
    {exercise.correctionLatex.map((line,index)=><div class="correction-row" key={`${line}-${index}`}><RelationMark relation={exercise.correctionRelations?.[index]||workspace.defaultRelation} workspace={workspace}/><StaticMath latex={`\\displaystyle ${line}`}/></div>)}
  </div></div>;
}

function Practice({pack,sessionStore,progressStore,maxRows,category,seed:initialSeed,initialRows,initialAttempt,onBack}){
  const [seed,setSeed]=useState(initialSeed>>>0);
  const exercise=useMemo(()=>pack.generateExercise(category,seed),[pack,category,seed]);
  const workspace=resolveExerciseWorkspace(pack,exercise);
  const keyboardConfig=resolveExerciseKeyboard(pack,exercise);
  const hintSequence=useMemo(()=>createHintSequence(pack,exercise),[pack,exercise]);
  const resumedAttempt=initialAttempt||{};
  const [rows,setRows]=useState(()=>hydrateDerivationRows(initialRows,workspace));
  const [activeId,setActiveId]=useState(rows[0]?.id??0);
  const [activeField,setActiveField]=useState(null);
  const [feedback,setFeedback]=useState({kind:'editing'});
  const [showCorrection,setShowCorrection]=useState(false);
  const [fullCorrectionUsed,setFullCorrectionUsed]=useState(Boolean(resumedAttempt.fullCorrectionUsed));
  const [hintCount,setHintCount]=useState(()=>Math.min(hintSequence.length,Math.max(0,Math.floor(resumedAttempt.hintCount||0))));
  const [selectionMode,setSelectionMode]=useState(false);
  const [mistakes,setMistakes]=useState(()=>Math.max(0,Math.floor(resumedAttempt.mistakes||0)));
  const [recent,setRecent]=useState(()=>[recentExerciseEntry(initialSeed,exercise)]);
  const nextId=useRef(Math.max(1,...rows.map(row=>row.id+1)));
  const fields=useRef(new Map());
  const startedAt=useRef(Number.isFinite(resumedAttempt.startedAt)&&resumedAttempt.startedAt>0?resumedAttempt.startedAt:Date.now());
  const completionRecorded=useRef(false);

  useEffect(()=>sessionStore.save({
    category,
    seed,
    rows:serializeDerivationRows(rows),
    attempt:{mistakes,hintCount,fullCorrectionUsed,startedAt:startedAt.current}
  }),[sessionStore,category,seed,rows,mistakes,hintCount,fullCorrectionUsed]);
  useEffect(()=>{requestAnimationFrame(()=>{const field=fields.current.get(activeId);if(field){setActiveField(field);if(!field.hasFocus())field.focus();}});},[seed,activeId]);

  const register=(id,field)=>{
    if(field){fields.current.set(id,field);if(id===activeId)setActiveField(field);}
    else{fields.current.delete(id);if(id===activeId)setActiveField(null);}
  };
  const edit=(id,value)=>{setRows(old=>old.map(row=>row.id===id?{...row,value}:row));setFeedback({kind:'editing'});setShowCorrection(false);};
  const focus=(id,field)=>{setActiveId(id);setActiveField(field);configureMathField(field);};
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
    if(rows.length>=maxRows)return;
    const at=rows.findIndex(row=>row.id===id),position=at<0?rows.length:at+1,newId=nextId.current++;
    setRows(old=>[...old.slice(0,position),createDerivationRow(newId,'',workspace),...old.slice(position)]);
    setActiveId(newId);setActiveField(null);setSelectionMode(false);setFeedback({kind:'editing'});
    requestAnimationFrame(()=>fields.current.get(newId)?.focus());
  };
  const deleteEmpty=id=>{
    if(rows.length<=1)return false;
    const at=rows.findIndex(row=>row.id===id);if(at<0||rows[at].value.trim()!=='')return false;
    const target=rows[Math.max(0,at-1)];
    setRows(old=>old.filter(row=>row.id!==id));setActiveId(target.id);setActiveField(null);setSelectionMode(false);setFeedback({kind:'editing'});
    requestAnimationFrame(()=>{const field=fields.current.get(target.id);if(field){setActiveField(field);field.focus();field.executeCommand('moveToMathfieldEnd');}});return true;
  };
  const verify=()=>{
    const result=pack.validateExercise(exercise,rows);
    if(result.kind==='error')setMistakes(value=>value+1);
    if(result.kind==='success'&&!completionRecorded.current){
      completionRecorded.current=true;
      progressStore.complete(exercise,{
        mistakes,
        hints:completionHintCost({revealed:hintCount,fullCorrection:fullCorrectionUsed}),
        durationMs:Date.now()-startedAt.current
      });
    }
    setFeedback(result);
  };
  const revealHint=()=>setHintCount(current=>revealHintCount(hintSequence,current));
  const toggleCorrection=()=>{
    if(!showCorrection)setFullCorrectionUsed(true);
    setShowCorrection(value=>!value);
  };
  const next=()=>{
    const choice=selectNextExercise(pack,category,progressStore.load(),{recent,currentPrompt:exercise.promptLatex});
    const nextSeed=choice.seed,candidate=choice.exercise;
    const nextWorkspace=resolveExerciseWorkspace(pack,candidate),id=nextId.current++;
    setRecent(old=>[...old.slice(-6),recentExerciseEntry(nextSeed,candidate)]);setSeed(nextSeed);setRows([createDerivationRow(id,'',nextWorkspace)]);setActiveId(id);setActiveField(null);setFeedback({kind:'editing'});setShowCorrection(false);setFullCorrectionUsed(false);setHintCount(0);setSelectionMode(false);setMistakes(0);
    startedAt.current=Date.now();completionRecorded.current=false;
  };
  const invalid=feedback.kind==='error'?feedback.row:-1;
  const incomplete=feedback.kind==='incomplete'?feedback.row:-1;
  const success=feedback.kind==='success';
  const shownHints=visibleHints(hintSequence,hintCount);
  const canRevealHint=hintCount<hintSequence.length;
  const canShowCorrection=['error','incomplete','continue'].includes(feedback.kind);

  return <main class="practice-screen" data-pack={pack.id}>
    <header class="practice-header"><button type="button" class="back-button" aria-label="Retour aux catégories" onClick={onBack}>‹</button><div class="practice-category">{pack.categoryInfo[category].title}</div><div class="header-spacer"/></header>
    <DerivationEditor promptKey={`${seed}:${exercise.promptLatex}`} promptLatex={exercise.promptLatex} rows={rows} workspace={workspace} invalidRow={invalid} incompleteRow={incomplete} onValue={edit} onFocus={focus} onDirectPointer={directPointer} onEnter={addAfter} onDeleteEmpty={deleteEmpty} onRelationChange={changeRelation} register={register}/>
    {!success&&<div class="practice-controls"><button type="button" class="verify-button" onClick={verify}>{pack.ui?.verifyLabel||'Vérifier'}</button></div>}
    <div class="feedback" aria-live="polite">
      {feedback.kind==='error'&&<div class="feedback-message feedback-message--error">{feedback.message}</div>}
      {(feedback.kind==='incomplete'||feedback.kind==='continue')&&<div class="feedback-message feedback-message--neutral">{feedback.message}</div>}
      {success&&<div class="success-panel"><div class="feedback-message feedback-message--success">{pack.ui?.successLabel||'Correct.'}</div><button type="button" class="next-button" onClick={next}>{pack.ui?.nextLabel||'Exercice suivant'}</button></div>}
      {!success&&<div class="assist-controls">
        {hintSequence.length>0&&<button type="button" class="hint-button" disabled={!canRevealHint} onClick={revealHint}>{canRevealHint?(hintCount===0?'Indice':'Indice suivant'):'Tous les indices affichés'}</button>}
        {canShowCorrection&&<button type="button" class="correction-toggle" onClick={toggleCorrection}>{showCorrection?(pack.ui?.hideCorrectionLabel||'Masquer la correction'):(pack.ui?.showCorrectionLabel||'Voir une correction')}</button>}
      </div>}
    </div>
    {!success&&<HintPanel hints={shownHints}/>} 
    {showCorrection&&<Correction exercise={exercise} workspace={workspace} pack={pack}/>} 
    {!success&&<MathKeyboard field={activeField} selectionMode={selectionMode} setSelectionMode={setSelectionMode} onEnter={()=>addAfter(activeId)} onDeleteEmpty={()=>deleteEmpty(activeId)} onSetRelation={setActiveRelation} keyboardConfig={keyboardConfig}/>} 
  </main>;
}

export function TrainerApp({pack,maxRows=20}){
  const sessionStore=useMemo(()=>createSessionStore(pack,{maxRows,legacyKeys:pack.session?.legacyKeys||[]}),[pack,maxRows]);
  const progressStore=useMemo(()=>createProgressStore(pack),[pack]);
  const [screen,setScreen]=useState({kind:'home'});
  if(screen.kind==='practice')return <Practice pack={pack} sessionStore={sessionStore} progressStore={progressStore} maxRows={maxRows} category={screen.category} seed={screen.seed} initialRows={screen.rows} initialAttempt={screen.attempt} onBack={()=>setScreen({kind:'home'})}/>;
  return <TrainerHome pack={pack} sessionStore={sessionStore} progressStore={progressStore} onChoose={category=>{
    sessionStore.clear();
    const choice=selectNextExercise(pack,category,progressStore.load());
    setScreen({kind:'practice',category,seed:choice.seed,rows:['']});
  }} onResume={()=>{const session=sessionStore.load();if(session)setScreen({kind:'practice',...session});}}/>;
}
