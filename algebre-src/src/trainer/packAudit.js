import { hasPlaceholder } from '../math.js';
import { hydrateDerivationRows } from './core.js';
import { assertExerciseForPack, resolveExerciseWorkspace } from './pack.js';

function stableExerciseShape(exercise){
  return JSON.stringify({
    id:exercise.id,
    category:exercise.category,
    sourceCategory:exercise.sourceCategory||null,
    seed:exercise.seed,
    promptLatex:exercise.promptLatex,
    expectedLatex:exercise.expectedLatex??null,
    correctionLatex:exercise.correctionLatex,
    correctionRelations:exercise.correctionRelations||null,
    difficulty:exercise.difficulty??null,
    skills:exercise.skills||null
  });
}

function fail(pack,category,seed,message){
  throw new Error(`[${pack.id}] ${category} seed ${seed}: ${message}`);
}

export function auditGeneratedExercise(pack,category,seed){
  const normalizedSeed=seed>>>0;
  let exercise;
  try{
    exercise=pack.generateExercise(category,normalizedSeed);
    assertExerciseForPack(pack,exercise);
  }catch(error){
    fail(pack,category,normalizedSeed,error instanceof Error?error.message:String(error));
  }

  if(exercise.seed!==normalizedSeed)fail(pack,category,normalizedSeed,`exercise.seed is ${exercise.seed}`);
  if(hasPlaceholder(exercise.promptLatex))fail(pack,category,normalizedSeed,'prompt contains an empty placeholder');
  if(!exercise.correctionLatex.length)fail(pack,category,normalizedSeed,'correction is empty');

  const repeated=pack.generateExercise(category,normalizedSeed);
  if(stableExerciseShape(repeated)!==stableExerciseShape(exercise))fail(pack,category,normalizedSeed,'generation is not deterministic');

  const workspace=resolveExerciseWorkspace(pack,exercise);
  if(exercise.correctionRelations!==undefined){
    if(!Array.isArray(exercise.correctionRelations)||exercise.correctionRelations.length!==exercise.correctionLatex.length){
      fail(pack,category,normalizedSeed,'correctionRelations must match correctionLatex length');
    }
    for(const relation of exercise.correctionRelations){
      if(!workspace.allowedRelations.includes(relation))fail(pack,category,normalizedSeed,`correction uses forbidden relation ${relation}`);
    }
  }

  const mixed=pack.training?.mixedCategory;
  if(category===mixed){
    if(!exercise.sourceCategory||exercise.sourceCategory===mixed||!pack.categories.includes(exercise.sourceCategory)){
      fail(pack,category,normalizedSeed,'mixed exercise has no valid sourceCategory');
    }
  }

  const rows=hydrateDerivationRows(exercise.correctionLatex,workspace);
  const validation=pack.validateExercise(exercise,rows);
  if(validation?.kind!=='success'){
    fail(pack,category,normalizedSeed,`its own correction validates as ${validation?.kind||'unknown'}${validation?.message?`: ${validation.message}`:''}`);
  }

  return Object.freeze({
    packId:pack.id,
    category,
    seed:normalizedSeed,
    sourceCategory:exercise.sourceCategory||category,
    correctionSteps:exercise.correctionLatex.length
  });
}

export function auditTrainerPack(pack,options={}){
  const seeds=Math.max(1,Math.floor(options.seeds??250));
  const firstSeed=(options.firstSeed??1)>>>0;
  const categories=options.categories||pack.categories;
  const perCategory={};
  let exercises=0,correctionSteps=0;

  for(const category of categories){
    if(!pack.categories.includes(category))throw new Error(`[${pack.id}] Unknown audit category ${category}`);
    let categorySteps=0;
    for(let offset=0;offset<seeds;offset++){
      const result=auditGeneratedExercise(pack,category,(firstSeed+offset)>>>0);
      exercises++;categorySteps+=result.correctionSteps;correctionSteps+=result.correctionSteps;
    }
    perCategory[category]=Object.freeze({exercises:seeds,correctionSteps:categorySteps});
  }

  return Object.freeze({
    packId:pack.id,
    categories:Object.freeze([...categories]),
    exercises,
    correctionSteps,
    perCategory:Object.freeze(perCategory)
  });
}
