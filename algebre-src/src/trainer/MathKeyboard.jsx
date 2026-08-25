import { useEffect, useState } from 'preact/hooks';
import { getKeyDefinition, getKeyboardProfile } from './keyboardProfiles.js';
import { StaticMath } from './MathView.jsx';

function Key({dataKey,label,math=true,className='',onClick,ariaLabel}){
  return <button type="button" data-key={dataKey} aria-label={ariaLabel} class={`key ${math?'key--math':''} ${className}`} onPointerDown={e=>e.preventDefault()} onClick={onClick}>{math?<StaticMath latex={label}/>:label}</button>;
}

export function resolveKeyboardDisplayMode(config,isDesktop){
  return isDesktop?(config.desktopMode||'compact'):(config.mobileMode||'full');
}

function useDesktopInput(){
  const query='(min-width: 900px) and (pointer: fine)';
  const [desktop,setDesktop]=useState(()=>typeof window!=='undefined'&&window.matchMedia?.(query).matches||false);
  useEffect(()=>{
    if(typeof window==='undefined'||!window.matchMedia)return;
    const media=window.matchMedia(query),update=()=>setDesktop(media.matches);
    update();media.addEventListener?.('change',update);
    return()=>media.removeEventListener?.('change',update);
  },[]);
  return desktop;
}

export function MathKeyboard({
  field,
  selectionMode,
  setSelectionMode,
  onEnter,
  onDeleteEmpty,
  onSetRelation,
  keyboardConfig,
  forceDisplayMode
}){
  const profile=getKeyboardProfile(keyboardConfig.profile);
  const desktop=useDesktopInput();
  const displayMode=forceDisplayMode||resolveKeyboardDisplayMode(keyboardConfig,desktop);
  const extraKeys=keyboardConfig.extraKeys||[];

  const insert=(latex,opts={})=>{
    if(!field)return;
    field.insert(latex,{insertionMode:'replaceSelection',selectionMode:'after',mode:'math',focus:true,...opts});
    field.mode='math';field.focus();setSelectionMode(false);
  };
  const structure=kind=>{
    if(!field)return;
    const map={fraction:'\\frac{#0}{#?}',sqrt:'\\sqrt{#0}',parentheses:'\\left(#0\\right)',abs:'\\left|#0\\right|'};
    field.insert(map[kind],{insertionMode:'replaceSelection',selectionMode:'placeholder',mode:'math',focus:true});
    field.mode='math';field.focus();setSelectionMode(false);
  };
  const square=()=>{
    if(!field)return;
    field.insert('#@^{2}',{insertionMode:'replaceSelection',selectionMode:'after',mode:'math',focus:true});
    field.mode='math';field.focus();setSelectionMode(false);
  };
  const move=dir=>{
    if(!field)return;
    const cmd=dir==='left'?(selectionMode?'extendSelectionBackward':'moveToPreviousChar'):dir==='right'?(selectionMode?'extendSelectionForward':'moveToNextChar'):dir==='up'?'moveUp':'moveDown';
    field.executeCommand(cmd);field.focus();
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
  const runAction=definition=>{
    const action=definition.action;
    if(action.type==='insert')return insert(action.latex);
    if(action.type==='structure')return structure(action.kind);
    if(action.type==='square')return square();
    if(action.type==='move')return move(action.direction);
    if(action.type==='erase')return erase();
    if(action.type==='enter')return enter();
    if(action.type==='text-or')return textOr();
    if(action.type==='toggle-selection')return setSelectionMode(value=>!value);
    if(action.type==='set-relation'&&onSetRelation)return onSetRelation(action.relation);
  };
  const renderKey=id=>{
    const definition=getKeyDefinition(id),active=id==='select'&&selectionMode;
    return <Key key={id} dataKey={definition.id} label={definition.label} math={definition.math} ariaLabel={definition.ariaLabel} className={`${definition.className||''} ${active?'key--active':''}`} onClick={()=>runAction(definition)}/>;
  };
  const extraRow=extraKeys.length?<div class="key-extra-row" aria-label="Relations disponibles">{extraKeys.map(renderKey)}</div>:null;

  if(displayMode==='compact'){
    return <div class="keyboard keyboard--compact" aria-label="Outils mathématiques" data-profile={profile.id} data-display-mode="compact">
      {extraRow}
      <div class="key-compact-row">{profile.compact.map(renderKey)}</div>
    </div>;
  }

  return <div class="keyboard keyboard--full" aria-label="Clavier mathématique" data-profile={profile.id} data-display-mode="full">
    {extraRow}
    <div class="key-grid">{profile.grid.map(renderKey)}</div>
    <div class="key-bottom-row">{profile.bottom.map(renderKey)}</div>
  </div>;
}
