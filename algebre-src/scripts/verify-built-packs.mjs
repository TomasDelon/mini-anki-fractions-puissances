import fs from 'node:fs';
import path from 'node:path';
import { PACK_BUILD_IDS, getPackBuildConfig, packBasePath } from '../src/packs/catalog.js';

const root=path.resolve(process.cwd(),process.argv[2]||'dist-packs');
const ids=new Set();

function assert(condition,message){
  if(!condition) throw new Error(message);
}

function allJavaScript(dir){
  const files=[];
  const visit=current=>{
    for(const entry of fs.readdirSync(current,{withFileTypes:true})){
      const absolute=path.join(current,entry.name);
      if(entry.isDirectory()) visit(absolute);
      else if(entry.isFile()&&entry.name.endsWith('.js')) files.push(absolute);
    }
  };
  visit(dir);
  return files.map(file=>fs.readFileSync(file,'utf8')).join('\n');
}

for(const id of PACK_BUILD_IDS){
  const pack=getPackBuildConfig(id);
  const dir=path.join(root,pack.slug);
  const indexPath=path.join(dir,'index.html');
  const manifestPath=path.join(dir,'manifest.webmanifest');
  const swPath=path.join(dir,'sw.js');
  assert(fs.existsSync(indexPath),`Missing index.html for ${id}`);
  assert(fs.existsSync(manifestPath),`Missing manifest.webmanifest for ${id}`);
  assert(fs.existsSync(swPath),`Missing sw.js for ${id}`);

  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const base=packBasePath(pack);
  assert(manifest.id===base,`Wrong manifest id for ${id}: ${manifest.id}`);
  assert(manifest.start_url===base,`Wrong start_url for ${id}`);
  assert(manifest.scope===base,`Wrong scope for ${id}`);
  assert(manifest.name===pack.name,`Wrong manifest name for ${id}`);
  assert(manifest.short_name===pack.shortName,`Wrong short_name for ${id}`);
  assert(manifest.description===pack.description,`Wrong description for ${id}`);
  assert(!ids.has(manifest.id),`Duplicate PWA id ${manifest.id}`);
  ids.add(manifest.id);

  const index=fs.readFileSync(indexPath,'utf8');
  assert(index.includes(`${base}manifest.webmanifest`),`Manifest link does not use ${base} for ${id}`);
  assert(index.includes(base),`Built HTML does not reference its deployment base for ${id}`);
  assert(index.includes(`<title>${pack.name}</title>`),`Wrong HTML title for ${id}`);
  assert(index.includes(`apple-mobile-web-app-title\" content=\"${pack.name}`)||index.includes(`apple-mobile-web-app-title" content="${pack.name}`),`Wrong iOS app title for ${id}`);
  assert(!index.includes('__TRAINER_'),`Unresolved HTML metadata placeholder for ${id}`);

  const javascript=allJavaScript(dir);
  for(const otherId of PACK_BUILD_IDS){
    if(otherId!==id) assert(!javascript.includes(otherId),`${id} production bundle still contains ${otherId}`);
  }
}

console.log(`Verified ${PACK_BUILD_IDS.length} independent installable trainer PWAs.`);
