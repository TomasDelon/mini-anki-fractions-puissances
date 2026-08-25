import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getPackBuildConfig } from '../src/packs/catalog.js';

const viteBin=fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url));

export function buildPack(packId='equations-3eme',outDir='dist',options={}){
  const pack=getPackBuildConfig(packId);
  const absoluteOut=path.resolve(process.cwd(),outDir);
  const result=spawnSync(process.execPath,[viteBin,'build'],{
    cwd:process.cwd(),
    stdio:'inherit',
    env:{
      ...process.env,
      TRAINER_PACK:pack.id,
      TRAINER_OUT_DIR:absoluteOut,
      TRAINER_ALLOW_PACK_SWITCH:options.allowPackSwitch?'1':'0'
    }
  });
  if(result.error) throw result.error;
  if(result.status!==0) throw new Error(`Build failed for ${pack.id} with exit code ${result.status}`);
  return {pack,outDir:absoluteOut};
}

const invoked=fileURLToPath(import.meta.url)===path.resolve(process.argv[1]||'');
if(invoked){
  const packId=process.argv[2]||'equations-3eme';
  const outDir=process.argv[3]||'dist';
  buildPack(packId,outDir,{allowPackSwitch:process.env.TRAINER_ALLOW_PACK_SWITCH==='1'});
}
