function normalizeRow(row,index){
  return Object.freeze({
    id:Number.isFinite(row?.id)?Math.floor(row.id):index,
    value:typeof row?.value==='string'?row.value:'',
    relationBefore:typeof row?.relationBefore==='string'?row.relationBefore:null
  });
}

export function normalizeDerivationSnapshot(snapshot){
  const source=Array.isArray(snapshot?.rows)?snapshot.rows:[];
  const rows=Object.freeze(source.map(normalizeRow));
  const requested=Number.isFinite(snapshot?.activeId)?Math.floor(snapshot.activeId):null;
  const activeId=rows.some(row=>row.id===requested)?requested:(rows[0]?.id??null);
  return Object.freeze({rows,activeId});
}

export function derivationSnapshotEqual(a,b){
  const left=normalizeDerivationSnapshot(a),right=normalizeDerivationSnapshot(b);
  if(left.activeId!==right.activeId||left.rows.length!==right.rows.length)return false;
  for(let index=0;index<left.rows.length;index++){
    const x=left.rows[index],y=right.rows[index];
    if(x.id!==y.id||x.value!==y.value||x.relationBefore!==y.relationBefore)return false;
  }
  return true;
}

export function createDerivationHistory(initial,options={}){
  const limit=Number.isFinite(options.limit)?Math.max(1,Math.floor(options.limit)):120;
  return Object.freeze({
    past:Object.freeze([]),
    present:normalizeDerivationSnapshot(initial),
    future:Object.freeze([]),
    limit
  });
}

export function commitDerivationHistory(history,next){
  const normalized=normalizeDerivationSnapshot(next);
  if(derivationSnapshotEqual(history.present,normalized))return history;
  const past=[...history.past,history.present].slice(-history.limit);
  return Object.freeze({
    ...history,
    past:Object.freeze(past),
    present:normalized,
    future:Object.freeze([])
  });
}

export function undoDerivationHistory(history){
  if(!history.past.length)return history;
  const present=history.past.at(-1);
  return Object.freeze({
    ...history,
    past:Object.freeze(history.past.slice(0,-1)),
    present,
    future:Object.freeze([history.present,...history.future].slice(0,history.limit))
  });
}

export function redoDerivationHistory(history){
  if(!history.future.length)return history;
  const [present,...rest]=history.future;
  return Object.freeze({
    ...history,
    past:Object.freeze([...history.past,history.present].slice(-history.limit)),
    present,
    future:Object.freeze(rest)
  });
}

export function resetDerivationHistory(history,next){
  return createDerivationHistory(next,{limit:history?.limit||120});
}

export function canUndoDerivation(history){return Boolean(history?.past?.length);}
export function canRedoDerivation(history){return Boolean(history?.future?.length);}
