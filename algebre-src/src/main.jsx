import { h, render } from 'preact';
import { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';
import './styles.css';
import './trainer/trainer.css';
import { analyze, setEqual } from './math.js';
import { resolveTrainerPack } from './packs/index.js';
import { TrainerApp } from './trainer/TrainerApp.jsx';

MathfieldElement.soundsDirectory=null;
MathfieldElement.keypressVibration=false;

const pack=resolveTrainerPack(location.search);
render(<TrainerApp pack={pack}/>,document.getElementById('app'));

if(import.meta.env.DEV||location.hostname==='127.0.0.1'||location.hostname==='localhost'){
  window.__ALGEBRE_TEST__={analyze,setEqual,generateExercise:pack.generateExercise,pack};
}
