import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

const base='/mini-anki-fractions-puissances/algebre/';

export default defineConfig({
  base,
  plugins:[
    preact(),
    VitePWA({
      registerType:'autoUpdate',
      includeAssets:['apple-touch-icon.png'],
      manifest:{
        id:base,
        name:'Algèbre',
        short_name:'Algèbre',
        description:'Exercices d’algèbre pour la 3ème, hors ligne, avec correction étape par étape.',
        start_url:base,
        scope:base,
        display:'standalone',
        background_color:'#ffffff',
        theme_color:'#ffffff',
        lang:'fr',
        orientation:'portrait-primary',
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
  build:{target:'es2022',sourcemap:false}
});
