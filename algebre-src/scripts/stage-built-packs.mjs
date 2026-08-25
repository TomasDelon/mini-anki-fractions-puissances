import fs from 'node:fs';
import path from 'node:path';
import { PACK_BUILD_IDS, getPackBuildConfig } from '../src/packs/catalog.js';

const buildRoot=path.resolve(process.cwd(),process.argv[2]||'dist-packs');
const destinationRoot=path.resolve(process.cwd(),process.argv[3]||'..');

for(const id of PACK_BUILD_IDS){
  const pack=getPackBuildConfig(id);
  const source=path.join(buildRoot,pack.slug);
  const destination=path.join(destinationRoot,pack.slug);
  if(!fs.existsSync(source)) throw new Error(`Missing built pack directory: ${source}`);
  fs.rmSync(destination,{recursive:true,force:true});
  fs.cpSync(source,destination,{recursive:true});
  process.stdout.write(`${pack.slug}\n`);
}
