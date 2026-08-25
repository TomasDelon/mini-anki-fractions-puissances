function freezeArray(value=[]){return Object.freeze([...value]);}

function hashSeed(seed,salt=0){
  let x=(seed>>>0)^(salt>>>0)^0x9e3779b9;
  x=Math.imul(x^(x>>>16),0x21f0aaad);
  x=Math.imul(x^(x>>>15),0x735a2d97);
  x^=x>>>15;
  return x>>>0;
}

export class TemplateRng{
  constructor(seed){this.state=(seed>>>0)||0x9e3779b9;}
  next(){let x=this.state;x^=x<<13;x^=x>>>17;x^=x<<5;this.state=x>>>0;return this.state/2**32;}
  int(min,max){return Math.floor(this.next()*(max-min+1))+min;}
  pick(values){if(!values.length)throw new Error('Cannot pick from an empty list');return values[this.int(0,values.length-1)];}
  nonZero(min=-9,max=9){let value=0;while(value===0)value=this.int(min,max);return value;}
}

export function defineExerciseTemplate(config){
  if(!config||typeof config!=='object')throw new Error('Exercise template configuration is required');
  if(!config.id||!/^[a-z0-9-]+$/.test(config.id))throw new Error('Exercise template needs a kebab-case id');
  if(!config.category||typeof config.category!=='string')throw new Error(`Template ${config.id} needs a category`);
  if(typeof config.build!=='function')throw new Error(`Template ${config.id} needs build(context)`);
  const skills=freezeArray(config.skills||[]);
  const difficulty=config.difficulty??null;
  if(difficulty!==null&&(!Number.isFinite(difficulty)||difficulty<1||difficulty>5))throw new Error(`Invalid difficulty for template ${config.id}`);
  return Object.freeze({...config,skills,difficulty});
}

function instantiateTemplate(packId,template,seed){
  const normalizedSeed=seed>>>0;
  const rng=new TemplateRng(hashSeed(normalizedSeed,0x51ed270b));
  const payload=template.build(Object.freeze({seed:normalizedSeed,rng,template}));
  if(!payload||typeof payload!=='object')throw new Error(`Template ${template.id} returned no exercise payload`);
  if(typeof payload.promptLatex!=='string'||!payload.promptLatex.trim())throw new Error(`Template ${template.id} returned no promptLatex`);
  if(!Array.isArray(payload.correctionLatex)||!payload.correctionLatex.length)throw new Error(`Template ${template.id} returned no correctionLatex`);
  return Object.freeze({
    ...payload,
    id:payload.id||`${packId}:${template.id}:${normalizedSeed}`,
    category:template.category,
    seed:normalizedSeed,
    templateId:template.id,
    ...(template.skills.length?{skills:template.skills}:{}),
    ...(template.difficulty!==null?{difficulty:template.difficulty}:{})
  });
}

export function createTemplateGenerator(config){
  if(!config?.packId)throw new Error('Template generator needs a packId');
  const categories=freezeArray(config.categories||[]);
  if(!categories.length)throw new Error('Template generator needs categories');
  const mixedCategory=config.mixedCategory??null;
  if(mixedCategory!==null&&!categories.includes(mixedCategory))throw new Error(`Unknown mixed category ${mixedCategory}`);
  const templates=freezeArray((config.templates||[]).map(defineExerciseTemplate));
  if(!templates.length)throw new Error('Template generator needs at least one template');
  const byCategory=new Map();
  for(const template of templates){
    if(!categories.includes(template.category)||template.category===mixedCategory)throw new Error(`Template ${template.id} uses invalid category ${template.category}`);
    const group=byCategory.get(template.category)||[];group.push(template);byCategory.set(template.category,group);
  }
  for(const category of categories){
    if(category!==mixedCategory&&!byCategory.get(category)?.length)throw new Error(`No exercise template for category ${category}`);
  }
  const baseCategories=categories.filter(category=>category!==mixedCategory);

  function generate(category,seed){
    if(!categories.includes(category))throw new Error(`Unknown exercise category ${category}`);
    const normalizedSeed=seed>>>0;
    if(category===mixedCategory){
      if(!mixedCategory)throw new Error('This template generator has no mixed category');
      const categoryIndex=hashSeed(normalizedSeed,0xa5a5a5a5)%baseCategories.length;
      const sourceCategory=baseCategories[categoryIndex];
      const inner=generate(sourceCategory,hashSeed(normalizedSeed,0x7f4a7c15));
      return Object.freeze({...inner,id:`${config.packId}:mixed:${normalizedSeed}`,category:mixedCategory,sourceCategory,seed:normalizedSeed});
    }
    const group=byCategory.get(category);
    const template=group[hashSeed(normalizedSeed,0x243f6a88)%group.length];
    return instantiateTemplate(config.packId,template,normalizedSeed);
  }

  return Object.freeze({
    packId:config.packId,
    categories,
    mixedCategory,
    templates,
    generate
  });
}
