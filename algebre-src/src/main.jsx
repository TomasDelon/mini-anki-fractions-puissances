import { h, render } from 'preact';
import { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';
import './styles.css';
import './trainer/trainer.css';
import './trainer/progress.css';
import activePack from '@active-trainer-pack';
import { analyze, setEqual } from './math.js';
import { TrainerApp } from './trainer/TrainerApp.jsx';

MathfieldElement.soundsDirectory=null;
MathfieldElement.keypressVibration=false;

async function resolveBootPack(){
  if(__TRAINER_ALLOW_PACK_SWITCH__){
    const {resolveTrainerPack}=await import('./packs/index.js');
    return resolveTrainerPack(location.search,activePack.id);
  }
  return activePack;
}

async function boot(){
  const pack=await resolveBootPack();
  render(<TrainerApp pack={pack}/>,document.getElementById('app'));

  if(import.meta.env.DEV||location.hostname==='127.0.0.1'||location.hostname==='localhost'){
    window.__ALGEBRE_TEST__={analyze,setEqual,generateExercise:pack.generateExercise,pack};
  }
}

boot();
