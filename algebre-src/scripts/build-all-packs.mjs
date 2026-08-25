import fs from 'node:fs';
import path from 'node:path';
import { PACK_BUILD_IDS, getPackBuildConfig, validatePackBuildCatalog } from '../src/packs/catalog.js';
import { buildPack } from './build-pack.mjs';

validatePackBuildCatalog();
const root=path.resolve(process.cwd(),process.argv[2]||'dist-packs');
fs.rmSync(root,{recursive:true,force:true});
fs.mkdirSync(root,{recursive:true});

for(const id of PACK_BUILD_IDS){
  const pack=getPackBuildConfig(id);
  const target=path.join(root,pack.slug);
  console.log(`\n=== Building ${pack.name} (${pack.id}) -> ${target} ===`);
  buildPack(pack.id,target);
}

console.log(`\nBuilt ${PACK_BUILD_IDS.length} trainer PWAs in ${root}`);
