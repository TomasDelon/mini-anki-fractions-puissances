import { useEffect, useRef } from 'preact/hooks';
import { relationInfo } from './core.js';
import { StaticMath, configureMathField } from './MathView.jsx';

export function RelationMark({relation,workspace,hidden=false,onChange}){
  const info=relationInfo(relation);
  const editable=workspace.relationMode==='student'&&workspace.allowedRelations.length>1&&onChange;
  if(hidden) return <span class="equiv equiv--hidden relation-mark" aria-hidden="true">{info.symbol||'='}</span>;
  if(editable){
    return <button type="button" class="equiv relation-mark relation-mark--editable" aria-label={`${info.aria}. Changer la relation`} onPointerDown={e=>e.preventDefault()} onClick={onChange}>{info.symbol}</button>;
  }
  return <span class="equiv relation-mark" aria-label={info.aria}>{info.symbol}</span>;
}

function MathRow({row,index,workspace,isInvalid,isIncomplete,onValue,onFocus,onDirectPointer,onEnter,onDeleteEmpty,onRelationChange,register}){
  const ref=useRef(null);
  useEffect(()=>{
    const mf=ref.current; if(!mf)return;
    configureMathField(mf); register(row.id,mf);
    if(mf.value!==row.value) mf.value=row.value;
    return()=>register(row.id,null);
  },[row.id]);
  useEffect(()=>{const mf=ref.current;if(mf&&mf.value!==row.value)mf.value=row.value;},[row.value]);
  const keydown=e=>{
    if(e.key==='Enter'){e.preventDefault();e.stopPropagation();onEnter(row.id);return;}
    if(e.key==='Backspace'&&e.currentTarget.value.trim()===''&&onDeleteEmpty(row.id)){e.preventDefault();e.stopPropagation();}
  };
  return <div class={`math-row derivation-row derivation-row--${workspace.layout} ${isInvalid?'math-row--invalid':''} ${isIncomplete?'math-row--incomplete':''}`}>
    <RelationMark relation={row.relationBefore} workspace={workspace} onChange={()=>onRelationChange(row.id)}/>
    <math-field ref={ref} aria-label={`Étape ${index+1}`} onInput={e=>onValue(row.id,e.currentTarget.value)} onFocus={e=>onFocus(row.id,e.currentTarget)} onPointerDown={onDirectPointer} onKeyDown={keydown}/>
    <span class="row-mark" aria-label={isInvalid?'Erreur':undefined}>{isInvalid?'×':''}</span>
  </div>;
}

export function Prompt({latex,workspace,promptKey}){
  return <div key={promptKey||latex} class={`prompt-row derivation-row derivation-row--${workspace.layout}`}>
    <RelationMark relation={workspace.defaultRelation} workspace={workspace} hidden/>
    <StaticMath latex={`\\displaystyle ${latex}`} className="prompt-math"/>
    <span class="row-mark"/>
  </div>;
}

export function DerivationEditor({
  promptLatex,
  promptKey,
  rows,
  workspace,
  invalidRow=-1,
  incompleteRow=-1,
  onValue,
  onFocus,
  onDirectPointer,
  onEnter,
  onDeleteEmpty,
  onRelationChange,
  register
}){
  return <section class={`workspace workspace--${workspace.layout}`} aria-label="Résolution">
    <Prompt key={promptKey||promptLatex} promptKey={promptKey} latex={promptLatex} workspace={workspace}/>
    <div class="student-rows">
      {rows.map((row,index)=><MathRow
        key={row.id}
        row={row}
        index={index}
        workspace={workspace}
        isInvalid={index===invalidRow}
        isIncomplete={index===incompleteRow}
        onValue={onValue}
        onFocus={onFocus}
        onDirectPointer={onDirectPointer}
        onEnter={onEnter}
        onDeleteEmpty={onDeleteEmpty}
        onRelationChange={onRelationChange}
        register={register}
      />)}
    </div>
  </section>;
}
