export const RELATIONS = Object.freeze({
  none: Object.freeze({ id:'none', symbol:'', latex:'', aria:'Aucune relation', semantics:'none' }),
  equals: Object.freeze({ id:'equals', symbol:'=', latex:'=', aria:'Égal à', semantics:'value-equality' }),
  iff: Object.freeze({ id:'iff', symbol:'⇔', latex:'\\Longleftrightarrow', aria:'Équivalent à', semantics:'equivalence' }),
  implies: Object.freeze({ id:'implies', symbol:'⇒', latex:'\\Longrightarrow', aria:'Implique', semantics:'implication' }),
  'reverse-implies': Object.freeze({ id:'reverse-implies', symbol:'⇐', latex:'\\Longleftarrow', aria:'Est impliqué par', semantics:'reverse-implication' })
});

export const DERIVATION_LAYOUTS = Object.freeze(['relations','aligned']);
export const RELATION_MODES = Object.freeze(['automatic','student']);

export function createWorkspace(overrides={}) {
  const workspace={
    type:'derivation',
    layout:'relations',
    relationMode:'automatic',
    allowedRelations:['iff'],
    defaultRelation:'iff',
    ...overrides
  };
  assertWorkspace(workspace);
  return Object.freeze({
    ...workspace,
    allowedRelations:Object.freeze([...workspace.allowedRelations])
  });
}

export function assertWorkspace(workspace) {
  if(!workspace || workspace.type!=='derivation') throw new Error('Unsupported workspace type');
  if(!DERIVATION_LAYOUTS.includes(workspace.layout)) throw new Error(`Unsupported derivation layout: ${workspace.layout}`);
  if(!RELATION_MODES.includes(workspace.relationMode)) throw new Error(`Unsupported relation mode: ${workspace.relationMode}`);
  if(!Array.isArray(workspace.allowedRelations) || workspace.allowedRelations.length===0) throw new Error('A derivation workspace needs at least one relation');
  for(const relation of workspace.allowedRelations){
    if(!RELATIONS[relation] || relation==='none') throw new Error(`Unsupported relation: ${relation}`);
  }
  if(!workspace.allowedRelations.includes(workspace.defaultRelation)) throw new Error('defaultRelation must be allowed');
  return true;
}

export function relationInfo(relation) {
  return RELATIONS[relation] || RELATIONS.none;
}

export function normalizeRelation(relation,workspace) {
  if(workspace.allowedRelations.includes(relation)) return relation;
  return workspace.defaultRelation;
}

export function createDerivationRow(id,value='',workspace,relationBefore) {
  return {
    id,
    value:String(value ?? ''),
    relationBefore:normalizeRelation(relationBefore || workspace.defaultRelation,workspace)
  };
}

// Accept both the legacy ["latex", ...] session format and the new
// [{ value, relationBefore }, ...] format so existing installed PWAs resume safely.
export function hydrateDerivationRows(storedRows,workspace,startId=0) {
  const rows=Array.isArray(storedRows) && storedRows.length ? storedRows : [''];
  return rows.map((row,index)=>{
    if(row && typeof row==='object' && !Array.isArray(row)){
      return createDerivationRow(startId+index,row.value,workspace,row.relationBefore);
    }
    return createDerivationRow(startId+index,row,workspace);
  });
}

export function serializeDerivationRows(rows) {
  return rows.map(row=>({ value:String(row.value ?? ''), relationBefore:row.relationBefore }));
}

export function cycleRelation(current,workspace) {
  const allowed=workspace.allowedRelations;
  const index=Math.max(0,allowed.indexOf(current));
  return allowed[(index+1)%allowed.length];
}

// Validation is routed by relation semantics. Keep empty rows in place so a
// validator can report the exact visual row that needs attention.
export function validateDerivation(promptLatex,rows,workspace,validators) {
  const relations=rows.map(row=>normalizeRelation(row.relationBefore,workspace));
  const values=rows.map(row=>String(row.value ?? ''));
  const only=relations[0] || workspace.defaultRelation;
  const homogeneous=relations.every(relation=>relation===only);

  if(homogeneous && only==='iff' && validators.iffChain) return validators.iffChain(promptLatex,values);
  if(homogeneous && only==='equals' && validators.equalsChain) return validators.equalsChain(promptLatex,values);
  if(homogeneous && only==='implies' && validators.impliesChain) return validators.impliesChain(promptLatex,values);

  if(validators.mixed) return validators.mixed(promptLatex,rows,workspace);
  return {kind:'error',row:0,message:'Ce type de relation n’est pas encore validé pour cet entraînement.'};
}
