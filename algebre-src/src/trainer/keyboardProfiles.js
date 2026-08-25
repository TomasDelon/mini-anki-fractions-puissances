const key = (id,label,action,options={}) => Object.freeze({ id,label,action:Object.freeze(action),math:true,...options });

export const KEY_LIBRARY = Object.freeze({
  '0':key('0','0',{type:'insert',latex:'0'}),
  '1':key('1','1',{type:'insert',latex:'1'}),
  '2':key('2','2',{type:'insert',latex:'2'}),
  '3':key('3','3',{type:'insert',latex:'3'}),
  '4':key('4','4',{type:'insert',latex:'4'}),
  '5':key('5','5',{type:'insert',latex:'5'}),
  '6':key('6','6',{type:'insert',latex:'6'}),
  '7':key('7','7',{type:'insert',latex:'7'}),
  '8':key('8','8',{type:'insert',latex:'8'}),
  '9':key('9','9',{type:'insert',latex:'9'}),
  plus:key('plus','+',{type:'insert',latex:'+'},{ariaLabel:'Plus'}),
  minus:key('minus','-',{type:'insert',latex:'-'},{ariaLabel:'Moins'}),
  times:key('times','\\times',{type:'insert',latex:'\\times'},{ariaLabel:'Multiplier'}),
  divide:key('divide','\\div',{type:'insert',latex:'\\div'},{ariaLabel:'Diviser'}),
  equals:key('equals','=',{type:'insert',latex:'='},{ariaLabel:'Égal'}),
  x:key('x','x',{type:'insert',latex:'x'},{ariaLabel:'x'}),
  square:key('square','{}^{2}',{type:'square'},{ariaLabel:'Carré'}),
  pm:key('pm','\\pm',{type:'insert',latex:'\\pm'},{ariaLabel:'Plus ou moins'}),
  parentheses:key('parentheses','(\\square)',{type:'structure',kind:'parentheses'},{ariaLabel:'Parenthèses'}),
  sqrt:key('sqrt','\\sqrt{\\square}',{type:'structure',kind:'sqrt'},{ariaLabel:'Racine carrée'}),
  fraction:key('fraction','\\dfrac{\\square}{\\square}',{type:'structure',kind:'fraction'},{ariaLabel:'Fraction'}),
  abs:key('abs','|\\square|',{type:'structure',kind:'abs'},{ariaLabel:'Valeur absolue'}),
  or:key('or','ou',{type:'text-or'},{math:false,className:'key--word',ariaLabel:'ou'}),
  up:key('up','↑',{type:'move',direction:'up'},{math:false,className:'key--nav',ariaLabel:'Monter'}),
  down:key('down','↓',{type:'move',direction:'down'},{math:false,className:'key--nav',ariaLabel:'Descendre'}),
  left:key('left','←',{type:'move',direction:'left'},{math:false,className:'key--nav',ariaLabel:'Déplacer à gauche'}),
  right:key('right','→',{type:'move',direction:'right'},{math:false,className:'key--nav',ariaLabel:'Déplacer à droite'}),
  select:key('select','Sélection',{type:'toggle-selection'},{math:false,className:'key--select',ariaLabel:'Mode sélection'}),
  backspace:key('backspace','⌫',{type:'erase'},{math:false,className:'key--backspace',ariaLabel:'Effacer'}),
  enter:key('enter','Entrée',{type:'enter'},{math:false,className:'key--enter',ariaLabel:'Nouvelle ligne'}),
  relationEquals:key('relation-equals','=',{type:'set-relation',relation:'equals'},{ariaLabel:'Relation égal à'}),
  relationIff:key('relation-iff','\\Longleftrightarrow',{type:'set-relation',relation:'iff'},{ariaLabel:'Relation équivalente à'}),
  relationImplies:key('relation-implies','\\Longrightarrow',{type:'set-relation',relation:'implies'},{ariaLabel:'Relation implique'}),
  relationReverseImplies:key('relation-reverse-implies','\\Longleftarrow',{type:'set-relation',relation:'reverse-implies'},{ariaLabel:'Relation est impliqué par'})
});

export const KEYBOARD_PROFILES = Object.freeze({
  'equations-3eme':Object.freeze({
    id:'equations-3eme',
    grid:Object.freeze(['7','8','9','plus','minus','times','4','5','6','x','square','equals','1','2','3','pm','parentheses','sqrt','0','fraction','abs','or','up','down']),
    bottom:Object.freeze(['select','left','right','backspace','enter']),
    compact:Object.freeze(['square','parentheses','sqrt','fraction','abs','pm','or'])
  }),
  'calcul-litteral-3eme':Object.freeze({
    id:'calcul-litteral-3eme',
    grid:Object.freeze(['7','8','9','plus','minus','times','4','5','6','x','square','parentheses','1','2','3','0','fraction','up']),
    bottom:Object.freeze(['select','left','right','down','backspace','enter']),
    compact:Object.freeze(['square','parentheses','fraction'])
  }),
  fractions:Object.freeze({
    id:'fractions',
    grid:Object.freeze(['7','8','9','plus','minus','times','4','5','6','divide','fraction','parentheses','1','2','3','0','up','down']),
    bottom:Object.freeze(['select','left','right','backspace','enter']),
    compact:Object.freeze(['fraction','times','divide','plus','minus','parentheses'])
  }),
  'derivation-relations':Object.freeze({
    id:'derivation-relations',
    grid:Object.freeze(['relationEquals','relationIff','relationImplies','relationReverseImplies']),
    bottom:Object.freeze([]),
    compact:Object.freeze(['relationEquals','relationIff','relationImplies','relationReverseImplies'])
  })
});

export function getKeyboardProfile(id){
  const profile=KEYBOARD_PROFILES[id];
  if(!profile) throw new Error(`Unknown keyboard profile: ${id}`);
  return profile;
}

export function getKeyDefinition(id){
  const definition=KEY_LIBRARY[id];
  if(!definition) throw new Error(`Unknown key: ${id}`);
  return definition;
}

export function validateKeyboardProfile(profile){
  for(const id of [...profile.grid,...profile.bottom,...(profile.compact||[])]) getKeyDefinition(id);
  return true;
}
