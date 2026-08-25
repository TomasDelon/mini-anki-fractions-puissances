export const PACK_BUILD_CATALOG=Object.freeze({
  'equations-3eme':Object.freeze({
    id:'equations-3eme',
    module:'./src/packs/equations3eme.js',
    slug:'algebre',
    name:'Algèbre',
    shortName:'Algèbre',
    description:'Exercices d’algèbre pour la 3ème, hors ligne, avec correction étape par étape.',
    lang:'fr',
    orientation:'portrait-primary',
    themeColor:'#ffffff',
    backgroundColor:'#ffffff'
  }),
  'calcul-litteral-3eme':Object.freeze({
    id:'calcul-litteral-3eme',
    module:'./src/packs/calculLitteral3eme.js',
    slug:'calcul-litteral',
    name:'Calcul littéral',
    shortName:'Calcul littéral',
    description:'Entraînement de calcul littéral pour la 3ème, hors ligne, avec calculs alignés et correction étape par étape.',
    lang:'fr',
    orientation:'portrait-primary',
    themeColor:'#ffffff',
    backgroundColor:'#ffffff'
  }),
  fractions:Object.freeze({
    id:'fractions',
    module:'./src/packs/fractions.js',
    slug:'fractions',
    name:'Fractions',
    shortName:'Fractions',
    description:'Entraînement exact sur les fractions, hors ligne, avec calculs alignés, simplification et révision adaptative.',
    lang:'fr',
    orientation:'portrait-primary',
    themeColor:'#ffffff',
    backgroundColor:'#ffffff'
  })
});

export const PACK_BUILD_IDS=Object.freeze(Object.keys(PACK_BUILD_CATALOG));

export function getPackBuildConfig(id){
  const config=PACK_BUILD_CATALOG[id];
  if(!config) throw new Error(`Unknown trainer pack: ${id}`);
  return config;
}

export function packBasePath(config,repository='mini-anki-fractions-puissances'){
  return `/${repository}/${config.slug}/`;
}

export function validatePackBuildCatalog(){
  const slugs=new Set();
  for(const id of PACK_BUILD_IDS){
    const config=getPackBuildConfig(id);
    if(config.id!==id) throw new Error(`Catalog id mismatch for ${id}`);
    if(!config.slug||!/^[a-z0-9-]+$/.test(config.slug)) throw new Error(`Invalid slug for ${id}`);
    if(slugs.has(config.slug)) throw new Error(`Duplicate pack slug: ${config.slug}`);
    slugs.add(config.slug);
    if(!config.name||!config.shortName||!config.description) throw new Error(`Incomplete PWA metadata for ${id}`);
  }
  return true;
}
