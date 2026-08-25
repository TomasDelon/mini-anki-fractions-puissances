import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createDerivationRow, cycleRelation, hydrateDerivationRows, serializeDerivationRows } from './core.js';
import { resolveExerciseKeyboard, resolveExerciseWorkspace } from './pack.js';
import { DerivationEditor, RelationMark } from './DerivationEditor.jsx';
import { MathKeyboard } from './MathKeyboard.jsx';
import { StaticMath, configureMathField } from './MathView.jsx';
import { createSessionStore } from './session.js';

function TrainerHome({pack,sessionStore,onChoose,onResume}){
  const saved=sessionStore.load();
  return <main class="home-screen" data-pack={pack.id}>
    <header class="home-header"><h1>{pack.title}</h1><p>{pack.ui?.homePrompt||'Choisis ce que tu veux pratiquer.'}</p></header>
    {saved&&<button class="resume-card" type="button" onClick={onResume}><span>{pack.ui?.resumeLabel||'Reprendre'}</span><strong>{pack.categoryInfo[saved.category].title}</strong></button>}
    <div class="category-list">
      {pack.categories.map(category=><button key={category} type="button" class={`category-button ${category==='mixed'?'category-button--mixed':''}`} onClick={()=>onChoose(category)}>
        <span class="category-copy"><strong>{pack.categoryInfo[category].title}</strong><StaticMath latex={pack.categoryInfo[category].formula} className="category-formula"/></span><span class="category-chevron" aria-hidden="true">›</span>
      </button>)}
    </div>
  </main>;
}

function Correction({exercise,workspace,pack}){
  return <div class="correction-block"><div class="correction-title">{pack.ui?.correctionTitle||'Une correction possible'}</div><div class="correction-math">
    <div class="correction-row correction-row--prompt"><RelationMark relation={workspace.defaultRelation} workspace={workspace} hidden/><StaticMath latex={`\\displaystyle ${exercise.promptLatex}`}/></div>
    {exercise.correctionLatex.map((line,index)=><div class="correction-row" key={`${line}-${index}`}><RelationMark relation={exercise.correctionRelations?.[index]||workspace.defaultRelation} workspace={workspace}/><StaticMath latex={`\\displaystyle ${line}`}/></div>)}
  </div></div>;
}

function Practice({pack,sessionStore,maxRows,category,seed:initialSeed,initialRows,onBack}){
  const [seed,setSeed]=useState(initialSeed>>>0);
  const exercise=useMemo(()=>pack.generateExercise(category,seed),[pack,category,seed]);
  const workspace=resolveExerciseWorkspace(pack,exercise);
  const keyboardConfig=resolveExerciseKeyboard(pack,exercise);
  const [rows,setRows]=useState(()=>hydrateDerivationRows(initialRows,workspace));
  const [activeId,setActiveId]=useState(rows[0]?.id??0);
  const [activeField,setActiveField]=useState(null);
  const [feedback,setFeedback]=useState({kind:'editing'});
  const [showCorrection,setShowCorrection]=useState(false);
  const [selectionMode,setSelectionMode]=useState(false);
  const [recent,setRecent]=useState([initialSeed>>>0]);
  const nextId=useRef(Math.max(1,...rows.map(row=>row.id+1)));
  const fields=useRef(new Map());

  useEffect(()=>sessionStore.save({category,seed,rows:serializeDerivationRows(rows)}),[sessionStore,category,seed,rows]);
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
  const verify=()=>setFeedback(pack.validateExercise(exercise,rows));
  const next=()=>{
    let nextSeed=pack.nextSeed(),candidate=pack.generateExercise(category,nextSeed),guard=0;
    while((recent.includes(nextSeed)||candidate.promptLatex===exercise.promptLatex)&&guard++<50){nextSeed=pack.nextSeed();candidate=pack.generateExercise(category,nextSeed);}
    const nextWorkspace=resolveExerciseWorkspace(pack,candidate),id=nextId.current++;
    setRecent(old=>[...old.slice(-7),nextSeed]);setSeed(nextSeed);setRows([createDerivationRow(id,'',nextWorkspace)]);setActiveId(id);setActiveField(null);setFeedback({kind:'editing'});setShowCorrection(false);setSelectionMode(false);
  };
  const invalid=feedback.kind==='error'?feedback.row:-1;
  const incomplete=feedback.kind==='incomplete'?feedback.row:-1;
  const success=feedback.kind==='success';

  return <main class="practice-screen" data-pack={pack.id}>
    <header class="practice-header"><button type="button" class="back-button" aria-label="Retour aux catégories" onClick={onBack}>‹</button><div class="practice-category">{pack.categoryInfo[category].title}</div><div class="header-spacer"/></header>
    <DerivationEditor promptKey={`${seed}:${exercise.promptLatex}`} promptLatex={exercise.promptLatex} rows={rows} workspace={workspace} invalidRow={invalid} incompleteRow={incomplete} onValue={edit} onFocus={focus} onDirectPointer={directPointer} onEnter={addAfter} onDeleteEmpty={deleteEmpty} onRelationChange={changeRelation} register={register}/>
    {!success&&<div class="practice-controls"><button type="button" class="verify-button" onClick={verify}>{pack.ui?.verifyLabel||'Vérifier'}</button></div>}
    <div class="feedback" aria-live="polite">
      {feedback.kind==='error'&&<div class="feedback-message feedback-message--error">{feedback.message}</div>}
      {(feedback.kind==='incomplete'||feedback.kind==='continue')&&<div class="feedback-message feedback-message--neutral">{feedback.message}</div>}
      {success&&<div class="success-panel"><div class="feedback-message feedback-message--success">{pack.ui?.successLabel||'Correct.'}</div><button type="button" class="next-button" onClick={next}>{pack.ui?.nextLabel||'Exercice suivant'}</button></div>}
      {!success&&['error','incomplete','continue'].includes(feedback.kind)&&<button type="button" class="correction-toggle" onClick={()=>setShowCorrection(value=>!value)}>{showCorrection?(pack.ui?.hideCorrectionLabel||'Masquer la correction'):(pack.ui?.showCorrectionLabel||'Voir une correction')}</button>}
    </div>
    {showCorrection&&<Correction exercise={exercise} workspace={workspace} pack={pack}/>} 
    {!success&&<MathKeyboard field={activeField} selectionMode={selectionMode} setSelectionMode={setSelectionMode} onEnter={()=>addAfter(activeId)} onDeleteEmpty={()=>deleteEmpty(activeId)} onSetRelation={setActiveRelation} keyboardConfig={keyboardConfig}/>} 
  </main>;
}

export function TrainerApp({pack,maxRows=20}){
  const sessionStore=useMemo(()=>createSessionStore(pack,{maxRows,legacyKeys:pack.session?.legacyKeys||[]}),[pack,maxRows]);
  const [screen,setScreen]=useState({kind:'home'});
  if(screen.kind==='practice')return <Practice pack={pack} sessionStore={sessionStore} maxRows={maxRows} category={screen.category} seed={screen.seed} initialRows={screen.rows} onBack={()=>setScreen({kind:'home'})}/>;
  return <TrainerHome pack={pack} sessionStore={sessionStore} onChoose={category=>{sessionStore.clear();setScreen({kind:'practice',category,seed:pack.nextSeed(),rows:['']});}} onResume={()=>{const session=sessionStore.load();if(session)setScreen({kind:'practice',...session});}}/>;
}
