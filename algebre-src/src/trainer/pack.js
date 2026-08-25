import { assertWorkspace } from './core.js';
import { getKeyDefinition, getKeyboardProfile, validateKeyboardProfile } from './keyboardProfiles.js';

function freezeRecord(record={}){
  return Object.freeze({...record});
}

function normalizeKeyboardConfig(keyboard){
  const extraKeys=Object.freeze([...(keyboard?.extraKeys||[])]);
  return Object.freeze({...keyboard,extraKeys});
}

function normalizeSessionConfig(session={}){
  return Object.freeze({legacyKeys:Object.freeze([...(session.legacyKeys||[])])});
}

function normalizeSkills(skills={}){
  const normalized={};
  for(const [id,skill] of Object.entries(skills)){
    if(!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid skill id: ${id}`);
    if(!skill?.title||typeof skill.title!=='string') throw new Error(`Skill ${id} needs a title`);
    normalized[id]=Object.freeze({
      ...skill,
      prerequisites:Object.freeze([...(skill.prerequisites||[])])
    });
  }
  for(const [id,skill] of Object.entries(normalized)){
    for(const prerequisite of skill.prerequisites){
      if(!normalized[prerequisite]) throw new Error(`Unknown prerequisite ${prerequisite} for skill ${id}`);
    }
  }
  return Object.freeze(normalized);
}

function normalizeCategorySkills(categories,categorySkills={},skills={}){
  const normalized={};
  for(const category of categories){
    const ids=[...(categorySkills[category]||[])];
    for(const id of ids) if(!skills[id]) throw new Error(`Unknown skill ${id} in category ${category}`);
    normalized[category]=Object.freeze(ids);
  }
  return Object.freeze(normalized);
}

function assertKeyboardConfig(keyboard){
  if(!keyboard?.profile) throw new Error('A trainer pack needs a keyboard profile');
  const profile=getKeyboardProfile(keyboard.profile);
  validateKeyboardProfile(profile);
  if(keyboard.extraKeys!==undefined&&!Array.isArray(keyboard.extraKeys)) throw new Error('keyboard.extraKeys must be an array');
  for(const id of keyboard.extraKeys||[]) getKeyDefinition(id);
  return true;
}

export function defineTrainerPack(config){
  if(!config || typeof config!=='object') throw new Error('A trainer pack configuration is required');
  if(!config.id || typeof config.id!=='string') throw new Error('A trainer pack needs an id');
  if(!Number.isInteger(config.version) || config.version<1) throw new Error('A trainer pack needs a positive integer version');
  if(!config.title || typeof config.title!=='string') throw new Error('A trainer pack needs a title');
  if(!config.workspace) throw new Error('A trainer pack needs a workspace');
  assertWorkspace(config.workspace);
  assertKeyboardConfig(config.keyboard);

  if(!Array.isArray(config.categories) || config.categories.length===0) throw new Error('A trainer pack needs at least one category');
  if(!config.categoryInfo || typeof config.categoryInfo!=='object') throw new Error('A trainer pack needs categoryInfo');
  for(const category of config.categories){
    if(!config.categoryInfo[category]) throw new Error(`Missing categoryInfo for ${category}`);
  }

  if(typeof config.generateExercise!=='function') throw new Error('A trainer pack needs generateExercise(category, seed)');
  if(typeof config.validateExercise!=='function') throw new Error('A trainer pack needs validateExercise(exercise, rows)');
  if(typeof config.nextSeed!=='function') throw new Error('A trainer pack needs nextSeed()');

  const skills=normalizeSkills(config.skills);
  const categorySkills=normalizeCategorySkills(config.categories,config.categorySkills,skills);

  return Object.freeze({
    ...config,
    categories:Object.freeze([...config.categories]),
    categoryInfo:freezeRecord(config.categoryInfo),
    keyboard:normalizeKeyboardConfig(config.keyboard),
    session:normalizeSessionConfig(config.session),
    skills,
    categorySkills,
    pedagogy:config.pedagogy ? Object.freeze({...config.pedagogy}) : Object.freeze({})
  });
}

export function resolveExerciseWorkspace(pack,exercise){
  const workspace=exercise?.workspace||pack.workspace;
  assertWorkspace(workspace);
  return workspace;
}

export function resolveExerciseKeyboard(pack,exercise){
  const keyboard=exercise?.keyboard?{...pack.keyboard,...exercise.keyboard}:pack.keyboard;
  assertKeyboardConfig(keyboard);
  return normalizeKeyboardConfig(keyboard);
}

export function resolveExerciseSkills(pack,exercise){
  const explicit=exercise?.skills;
  if(explicit!==undefined){
    if(!Array.isArray(explicit)) throw new Error('exercise.skills must be an array');
    for(const id of explicit) if(!pack.skills[id]) throw new Error(`Unknown exercise skill ${id}`);
    return Object.freeze([...new Set(explicit)]);
  }
  const sourceCategory=exercise?.sourceCategory||exercise?.category;
  return pack.categorySkills[sourceCategory]||Object.freeze([]);
}

export function resolveExerciseDifficulty(pack,exercise){
  const value=exercise?.difficulty??pack.categoryInfo[exercise?.sourceCategory||exercise?.category]?.difficulty??1;
  if(!Number.isFinite(value)||value<1||value>5) throw new Error(`Invalid exercise difficulty: ${value}`);
  return value;
}

export function assertExerciseForPack(pack,exercise){
  if(!exercise || typeof exercise!=='object') throw new Error('Exercise must be an object');
  if(!pack.categories.includes(exercise.category)) throw new Error(`Exercise category ${exercise.category} is not part of ${pack.id}`);
  if(typeof exercise.promptLatex!=='string' || !exercise.promptLatex.trim()) throw new Error('Exercise promptLatex is required');
  if(!Array.isArray(exercise.correctionLatex)) throw new Error('Exercise correctionLatex must be an array');
  resolveExerciseWorkspace(pack,exercise);
  resolveExerciseKeyboard(pack,exercise);
  resolveExerciseSkills(pack,exercise);
  resolveExerciseDifficulty(pack,exercise);
  return true;
}
