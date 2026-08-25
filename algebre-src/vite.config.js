import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { getPackBuildConfig, packBasePath, validatePackBuildCatalog } from './src/packs/catalog.js';

const repository='mini-anki-fractions-puissances';

function escapeHtml(value){
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function packHtmlMetadata(pack){
  return {
    name:'trainer-pack-html-metadata',
    transformIndexHtml(html){
      return html
        .replaceAll('__TRAINER_NAME__',escapeHtml(pack.name))
        .replaceAll('__TRAINER_DESCRIPTION__',escapeHtml(pack.description))
        .replaceAll('__TRAINER_THEME__',escapeHtml(pack.themeColor))
        .replaceAll('__TRAINER_LANG__',escapeHtml(pack.lang));
    }
  };
}

export default defineConfig(()=>{
  validatePackBuildCatalog();
  const packId=process.env.TRAINER_PACK||'equations-3eme';
  const pack=getPackBuildConfig(packId);
  const base=packBasePath(pack,repository);
  const activePack=fileURLToPath(new URL(pack.module,import.meta.url));
  const allowPackSwitch=process.env.TRAINER_ALLOW_PACK_SWITCH==='1';
  const resolverModule=fileURLToPath(new URL(allowPackSwitch?'./src/trainer/packResolver.switchable.js':'./src/trainer/packResolver.production.js',import.meta.url));
  const outDir=process.env.TRAINER_OUT_DIR||'dist';

  return {
    base,
    resolve:{
      alias:{
        '@active-trainer-pack':activePack,
        '@trainer-pack-resolver':resolverModule
      }
    },
    define:{
      __TRAINER_ALLOW_PACK_SWITCH__:JSON.stringify(allowPackSwitch)
    },
    plugins:[
      packHtmlMetadata(pack),
      preact(),
      VitePWA({
        registerType:'autoUpdate',
        includeAssets:['apple-touch-icon.png'],
        manifest:{
          id:base,
          name:pack.name,
          short_name:pack.shortName,
          description:pack.description,
          start_url:base,
          scope:base,
          display:'standalone',
          background_color:pack.backgroundColor,
          theme_color:pack.themeColor,
          lang:pack.lang,
          orientation:pack.orientation,
          categories:['education'],
          icons:[
            {src:'icon-192.png',sizes:'192x192',type:'image/png'},
            {src:'icon-512.png',sizes:'512x512',type:'image/png'}
          ]
        },
        workbox:{
          navigateFallback:'index.html',
          globPatterns:['**/*.{js,css,html,woff,woff2,png,svg,webmanifest}'],
          cleanupOutdatedCaches:true
        }
      })
    ],
    build:{target:'es2022',sourcemap:false,outDir,emptyOutDir:true}
  };
});
