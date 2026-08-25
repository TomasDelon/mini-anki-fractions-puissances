import { assertWorkspace } from './core.js';
import { getKeyboardProfile, validateKeyboardProfile } from './keyboardProfiles.js';

function freezeRecord(record={}){
  return Object.freeze({...record});
}

export function defineTrainerPack(config){
  if(!config || typeof config!=='object') throw new Error('A trainer pack configuration is required');
  if(!config.id || typeof config.id!=='string') throw new Error('A trainer pack needs an id');
  if(!Number.isInteger(config.version) || config.version<1) throw new Error('A trainer pack needs a positive integer version');
  if(!config.title || typeof config.title!=='string') throw new Error('A trainer pack needs a title');
  if(!config.workspace) throw new Error('A trainer pack needs a workspace');
  assertWorkspace(config.workspace);

  if(!config.keyboard?.profile) throw new Error('A trainer pack needs a keyboard profile');
  const keyboardProfile=getKeyboardProfile(config.keyboard.profile);
  validateKeyboardProfile(keyboardProfile);

  if(!Array.isArray(config.categories) || config.categories.length===0) throw new Error('A trainer pack needs at least one category');
  if(!config.categoryInfo || typeof config.categoryInfo!=='object') throw new Error('A trainer pack needs categoryInfo');
  for(const category of config.categories){
    if(!config.categoryInfo[category]) throw new Error(`Missing categoryInfo for ${category}`);
  }

  if(typeof config.generateExercise!=='function') throw new Error('A trainer pack needs generateExercise(category, seed)');
  if(typeof config.validateExercise!=='function') throw new Error('A trainer pack needs validateExercise(exercise, rows)');
  if(typeof config.nextSeed!=='function') throw new Error('A trainer pack needs nextSeed()');

  return Object.freeze({
    ...config,
    categories:Object.freeze([...config.categories]),
    categoryInfo:freezeRecord(config.categoryInfo),
    keyboard:Object.freeze({...config.keyboard}),
    pedagogy:config.pedagogy ? Object.freeze({...config.pedagogy}) : Object.freeze({})
  });
}

export function assertExerciseForPack(pack,exercise){
  if(!exercise || typeof exercise!=='object') throw new Error('Exercise must be an object');
  if(!pack.categories.includes(exercise.category)) throw new Error(`Exercise category ${exercise.category} is not part of ${pack.id}`);
  if(typeof exercise.promptLatex!=='string' || !exercise.promptLatex.trim()) throw new Error('Exercise promptLatex is required');
  if(!Array.isArray(exercise.correctionLatex)) throw new Error('Exercise correctionLatex must be an array');
  return true;
}
