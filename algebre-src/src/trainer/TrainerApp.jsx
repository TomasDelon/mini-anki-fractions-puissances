import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createAttemptTimer } from './attemptTimer.js';
import { createDerivationRow, cycleRelation, hydrateDerivationRows, serializeDerivationRows } from './core.js';
import {
  canRedoDerivation,
  canUndoDerivation,
  commitDerivationHistory,
  createDerivationHistory,
  redoDerivationHistory,
  resetDerivationHistory,
  undoDerivationHistory
} from './derivationHistory.js';
import { completionHintCost, createHintSequence, revealHintCount, visibleHints } from './hints.js';
import { resolveExerciseKeyboard, resolveExerciseWorkspace } from './pack.js';
import { categoryMastery, createProgressStore } from './progress.js';
import { buildReviewPlan, selectReviewExercise } from './reviewPlan.js';
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

function TrainerHome({pack,sessionStore,progressStore,onChoose,onResume,onReview}){
  const saved=sessionStore.load();
  const progress=progressStore.load();
  const reviewPlan=buildReviewPlan(pack,progress,{includeUnseen:false});
  const reviewTop=reviewPlan[0]||null;
  const resumeTitle=saved?.mode==='review'
    ?`Révision · ${pack.skills?.[saved.targetSkill]?.title||pack.categoryInfo[saved.category].title}`
    :saved?pack.categoryInfo[saved.category].title:'';

  return <main class="home-screen" data-pack={pack.id}>
    <header class="home-header"><h1>{pack.title}</h1><p>{pack.ui?.homePrompt||'Choisis ce que tu veux pratiquer.'}</p></header>
    {saved&&<button class="resume-card" type="button" onClick={onResume}><span>{pack.ui?.resumeLabel||'Reprendre'}</span><strong>{resumeTitle}</strong></button>}
    {reviewTop&&<button class="review-card" type="button" onClick={onReview} aria-label={`Révision : ${reviewPlan.length} compétence${reviewPlan.length>1?'s':''} à revoir`}>
      <span class="review-card-kicker">Révision</span>
      <strong>{reviewPlan.length} compétence{reviewPlan.length>1?'s':''} à revoir</strong>
      <small>{reviewTop.title}</small>
      <span class="review-card-chevron" aria-hidden="true">›</span>
    </button>}
    <div class="category-list">
      {pack.categories.map(category=><button key={category} type="button" class={`category-button ${category===pack.training?.mixedCategory?'category-button--mixed':''}`} onClick={()=>onChoose(category)}>
        <span class="category-copy"><strong>{pack.categoryInfo[category].title}</strong><StaticMath latex={pack.categoryInfo[category].formula} className="category-formula"/><CategoryProgress pack={pack} progress={progress} category={category}/></span><span class="category-chevron" aria-hidden="true">›</span>
      </button>)}
    </div>
  </main>;
}

function HistoryControls({undoEnabled,redoEnabled,onUndo,onRedo}){
  return <div class="history-controls" aria-label="Historique">
    <button type="button" aria-label="Annuler" disabled={!undoEnabled} onClick={onUndo}>↶</button>
    <button type="button" aria-label="Rétablir" disabled={!redoEnabled} onClick={onRedo}>↷</button>
  </div>;
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

function Practice({pack,sessionStore,progressStore,maxRows,category:initialCategory,seed:initialSeed,initialRows,initialAttempt,mode='category',targetSkill:initialTargetSkill,onBack}){
  const [category,setCategory]=useState(initialCategory);
  const [reviewTargetSkill,setReviewTargetSkill]=useState(initialTargetSkill||null);
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
  const [,setHistoryRevision]=useState(0);
  const nextId=useRef(Math.max(1,...rows.map(row=>row.id+1)));
  const fields=useRef(new Map());
  const rowsRef=useRef(rows);
  const activeIdRef=useRef(activeId);
  const historyRef=useRef(null);
  const attemptTimer=useRef(null);
  const completionRecorded=useRef(false);
  const sessionSnapshot=useRef(null);
  if(!historyRef.current)historyRef.current=createDerivationHistory({rows,activeId});
  if(!attemptTimer.current)attemptTimer.current=createAttemptTimer({elapsedMs:resumedAttempt.elapsedMs||0});
  rowsRef.current=rows;
  activeIdRef.current=activeId;
  sessionSnapshot.current={category,seed,rows,mistakes,hintCount,fullCorrectionUsed,mode,reviewTargetSkill};

  const persistSession=()=>{
    if(completionRecorded.current)return false;
    const snapshot=sessionSnapshot.current;
    return sessionStore.save({
      category:snapshot.category,
      seed:snapshot.seed,
      rows:serializeDerivationRows(snapshot.rows),
      ...(snapshot.mode==='review'?{mode:'review',targetSkill:snapshot.reviewTargetSkill}:{}),
      attempt:{
        mistakes:snapshot.mistakes,
        hintCount:snapshot.hintCount,
        fullCorrectionUsed:snapshot.fullCorrectionUsed,
        elapsedMs:attemptTimer.current.elapsed()
      }
    });
  };

  useEffect(()=>{persistSession();},[sessionStore,category,seed,rows,mistakes,hintCount,fullCorrectionUsed,reviewTargetSkill]);
  useEffect(()=>{
    const visibility=()=>{
      if(document.visibilityState==='hidden'){
        attemptTimer.current.pause();
        persistSession();
      }else if(!completionRecorded.current){
        attemptTimer.current.resume();
      }
    };
    const pageHide=()=>{
      attemptTimer.current.pause();
      persistSession();
    };
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pagehide',pageHide);
    return()=>{
      document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('pagehide',pageHide);
      if(!completionRecorded.current){
        attemptTimer.current.pause();
        persistSession();
      }
    };
  },[sessionStore]);
  useEffect(()=>{requestAnimationFrame(()=>{const field=fields.current.get(activeId);if(field){setActiveField(field);if(!field.hasFocus())field.focus();}});},[seed,activeId]);

  const register=(id,field)=>{
    if(field){fields.current.set(id,field);if(id===activeId)setActiveField(field);}
    else{fields.current.delete(id);if(id===activeId)setActiveField(null);}
  };
  const resetEditingState=()=>{setFeedback({kind:'editing'});setShowCorrection(false);setSelectionMode(false);};
  const focusRowEnd=id=>requestAnimationFrame(()=>{
    const field=fields.current.get(id);
    if(field){setActiveField(field);field.focus();field.executeCommand('moveToMathfieldEnd');}
  });
  const applyHistorySnapshot=snapshot=>{
    const nextActive=snapshot.activeId??snapshot.rows[0]?.id??0;
    rowsRef.current=snapshot.rows;activeIdRef.current=nextActive;
    setRows(snapshot.rows);setActiveId(nextActive);setActiveField(null);resetEditingState();
    setHistoryRevision(value=>value+1);focusRowEnd(nextActive);
  };
  const commitRows=(nextRows,nextActive=activeIdRef.current)=>{
    const resolvedActive=nextRows.some(row=>row.id===nextActive)?nextActive:(nextRows[0]?.id??0);
    historyRef.current=commitDerivationHistory(historyRef.current,{rows:nextRows,activeId:resolvedActive});
    const snapshot=historyRef.current.present;
    rowsRef.current=snapshot.rows;activeIdRef.current=snapshot.activeId??resolvedActive;
    setRows(snapshot.rows);setActiveId(activeIdRef.current);setHistoryRevision(value=>value+1);
    return snapshot;
  };
  const undo=()=>{
    if(feedback.kind==='success')return;
    const next=undoDerivationHistory(historyRef.current);
    if(next===historyRef.current)return;
    historyRef.current=next;applyHistorySnapshot(next.present);
  };
  const redo=()=>{
    if(feedback.kind==='success')return;
    const next=redoDerivationHistory(historyRef.current);
    if(next===historyRef.current)return;
    historyRef.current=next;applyHistorySnapshot(next.present);
  };
  const edit=(id,value)=>{
    commitRows(rowsRef.current.map(row=>row.id===id?{...row,value}:row),activeIdRef.current);
    setFeedback({kind:'editing'});setShowCorrection(false);
  };
  const focus=(id,field)=>{activeIdRef.current=id;setActiveId(id);setActiveField(field);configureMathField(field);};
  const directPointer=()=>setSelectionMode(false);
  const changeRelation=id=>{
    if(workspace.relationMode!=='student')return;
    commitRows(rowsRef.current.map(row=>row.id===id?{...row,relationBefore:cycleRelation(row.relationBefore,workspace)}:row),activeIdRef.current);
    setFeedback({kind:'editing'});setShowCorrection(false);
  };
  const setActiveRelation=relation=>{
    if(workspace.relationMode!=='student'||!workspace.allowedRelations.includes(relation))return;
    commitRows(rowsRef.current.map(row=>row.id===activeIdRef.current?{...row,relationBefore:relation}:row),activeIdRef.current);
    setFeedback({kind:'editing'});setShowCorrection(false);
  };
  const addAfter=(id=activeIdRef.current)=>{
    const current=rowsRef.current;
    if(current.length>=maxRows)return;
    const at=current.findIndex(row=>row.id===id),position=at<0?current.length:at+1,newId=nextId.current++;
    const nextRows=[...current.slice(0,position),createDerivationRow(newId,'',workspace),...current.slice(position)];
    commitRows(nextRows,newId);setActiveField(null);resetEditingState();focusRowEnd(newId);
  };
  const deleteEmpty=id=>{
    const current=rowsRef.current;
    if(current.length<=1)return false;
    const at=current.findIndex(row=>row.id===id);if(at<0||current[at].value.trim()!=='')return false;
    const target=current[Math.max(0,at-1)];
    commitRows(current.filter(row=>row.id!==id),target.id);setActiveField(null);resetEditingState();focusRowEnd(target.id);return true;
  };
  const verify=()=>{
    const result=pack.validateExercise(exercise,rowsRef.current);
    if(result.kind==='error')setMistakes(value=>value+1);
    if(result.kind==='success'&&!completionRecorded.current){
      completionRecorded.current=true;
      progressStore.complete(exercise,{
        mistakes,
        hints:completionHintCost({revealed:hintCount,fullCorrection:fullCorrectionUsed}),
        durationMs:attemptTimer.current.pause()
      });
      sessionStore.clear();
    }
    setFeedback(result);
  };
  const revealHint=()=>setHintCount(current=>revealHintCount(hintSequence,current));
  const toggleCorrection=()=>{
    if(!showCorrection)setFullCorrectionUsed(true);
    setShowCorrection(value=>!value);
  };
  const resetForChoice=choice=>{
    const nextSeed=choice.seed,candidate=choice.exercise;
    const nextWorkspace=resolveExerciseWorkspace(pack,candidate),id=nextId.current++;
    const nextRows=[createDerivationRow(id,'',nextWorkspace)];
    setRecent(old=>[...old.slice(-6),recentExerciseEntry(nextSeed,candidate)]);
    setCategory(candidate.category);setSeed(nextSeed);
    historyRef.current=resetDerivationHistory(historyRef.current,{rows:nextRows,activeId:id});
    rowsRef.current=historyRef.current.present.rows;activeIdRef.current=id;
    setRows(historyRef.current.present.rows);setActiveId(id);setActiveField(null);setHistoryRevision(value=>value+1);
    setFeedback({kind:'editing'});setShowCorrection(false);setFullCorrectionUsed(false);setHintCount(0);setSelectionMode(false);setMistakes(0);
    attemptTimer.current.reset();completionRecorded.current=false;
  };
  const next=()=>{
    const progress=progressStore.load();
    if(mode==='review'){
      const choice=selectReviewExercise(pack,progress,{includeUnseen:false,recent,currentPrompt:exercise.promptLatex});
      if(!choice){onBack();return;}
      setReviewTargetSkill(choice.targetSkill);resetForChoice(choice);return;
    }
    resetForChoice(selectNextExercise(pack,category,progress,{recent,currentPrompt:exercise.promptLatex}));
  };
  const invalid=feedback.kind==='error'?feedback.row:-1;
  const incomplete=feedback.kind==='incomplete'?feedback.row:-1;
  const success=feedback.kind==='success';
  const shownHints=visibleHints(hintSequence,hintCount);
  const canRevealHint=hintCount<hintSequence.length;
  const canShowCorrection=['error','incomplete','continue'].includes(feedback.kind);
  const undoEnabled=!success&&canUndoDerivation(historyRef.current);
  const redoEnabled=!success&&canRedoDerivation(historyRef.current);
  const reviewHasNext=mode!=='review'||buildReviewPlan(pack,progressStore.load(),{includeUnseen:false,limit:1}).length>0;
  const headerTitle=mode==='review'
    ?`Révision · ${pack.skills?.[reviewTargetSkill]?.title||pack.categoryInfo[category].title}`
    :pack.categoryInfo[category].title;
  const nextLabel=mode==='review'
    ?reviewHasNext?'Continuer la révision':'Terminer la révision'
    :(pack.ui?.nextLabel||'Exercice suivant');

  return <main class="practice-screen" data-pack={pack.id} data-training-mode={mode}>
    <header class="practice-header">
      <button type="button" class="back-button" aria-label="Retour aux catégories" onClick={onBack}>‹</button>
      <div class="practice-category">{headerTitle}</div>
      <HistoryControls undoEnabled={undoEnabled} redoEnabled={redoEnabled} onUndo={undo} onRedo={redo}/>
    </header>
    <DerivationEditor promptKey={`${seed}:${exercise.promptLatex}`} promptLatex={exercise.promptLatex} rows={rows} workspace={workspace} invalidRow={invalid} incompleteRow={incomplete} onValue={edit} onFocus={focus} onDirectPointer={directPointer} onEnter={addAfter} onDeleteEmpty={deleteEmpty} onRelationChange={changeRelation} onUndo={undo} onRedo={redo} register={register}/>
    {!success&&<div class="practice-controls"><button type="button" class="verify-button" onClick={verify}>{pack.ui?.verifyLabel||'Vérifier'}</button></div>}
    <div class="feedback" aria-live="polite">
      {feedback.kind==='error'&&<div class="feedback-message feedback-message--error">{feedback.message}</div>}
      {(feedback.kind==='incomplete'||feedback.kind==='continue')&&<div class="feedback-message feedback-message--neutral">{feedback.message}</div>}
      {success&&<div class="success-panel"><div class="feedback-message feedback-message--success">{pack.ui?.successLabel||'Correct.'}</div><button type="button" class="next-button" onClick={next}>{nextLabel}</button></div>}
      {!success&&<div class="assist-controls">
        {hintSequence.length>0&&<button type="button" class="hint-button" disabled={!canRevealHint} onClick={revealHint}>{canRevealHint?(hintCount===0?'Indice':'Indice suivant'):'Tous les indices affichés'}</button>}
        {canShowCorrection&&<button type="button" class="correction-toggle" onClick={toggleCorrection}>{showCorrection?(pack.ui?.hideCorrectionLabel||'Masquer la correction'):(pack.ui?.showCorrectionLabel||'Voir une correction')}</button>}
      </div>}
    </div>
    {!success&&<HintPanel hints={shownHints}/>} 
    {showCorrection&&<Correction exercise={exercise} workspace={workspace} pack={pack}/>} 
    {!success&&<MathKeyboard field={activeField} selectionMode={selectionMode} setSelectionMode={setSelectionMode} onEnter={()=>addAfter(activeIdRef.current)} onDeleteEmpty={()=>deleteEmpty(activeIdRef.current)} onSetRelation={setActiveRelation} keyboardConfig={keyboardConfig}/>} 
  </main>;
}

export function TrainerApp({pack,maxRows=20}){
  const sessionStore=useMemo(()=>createSessionStore(pack,{maxRows,legacyKeys:pack.session?.legacyKeys||[]}),[pack,maxRows]);
  const progressStore=useMemo(()=>createProgressStore(pack),[pack]);
  const [screen,setScreen]=useState({kind:'home'});
  if(screen.kind==='practice')return <Practice pack={pack} sessionStore={sessionStore} progressStore={progressStore} maxRows={maxRows} category={screen.category} seed={screen.seed} initialRows={screen.rows} initialAttempt={screen.attempt} mode={screen.mode||'category'} targetSkill={screen.targetSkill} onBack={()=>setScreen({kind:'home'})}/>;
  return <TrainerHome pack={pack} sessionStore={sessionStore} progressStore={progressStore} onChoose={category=>{
    sessionStore.clear();
    const choice=selectNextExercise(pack,category,progressStore.load());
    setScreen({kind:'practice',category,seed:choice.seed,rows:['']});
  }} onReview={()=>{
    const choice=selectReviewExercise(pack,progressStore.load(),{includeUnseen:false});
    if(!choice)return;
    sessionStore.clear();
    setScreen({kind:'practice',mode:'review',targetSkill:choice.targetSkill,category:choice.exercise.category,seed:choice.seed,rows:['']});
  }} onResume={()=>{const session=sessionStore.load();if(session)setScreen({kind:'practice',...session});}}/>;
}
