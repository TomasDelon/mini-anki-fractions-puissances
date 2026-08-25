export function StaticMath({latex,className=''}){
  // MathLive's <math-span> renders when connected. A value-derived key forces a
  // fresh rendered node when LaTeX changes, avoiding stale visuals after rerender.
  return <math-span key={latex} class={className} aria-hidden="true">{latex}</math-span>;
}

export function configureMathField(mf){
  if(!mf)return;
  mf.mathVirtualKeyboardPolicy='manual';
  mf.defaultMode='math';
  mf.smartMode=false;
  mf.smartFence=false;
  mf.smartSuperscript=true;
  mf.removeExtraneousParentheses=false;
  mf.popoverPolicy='off';
  mf.scriptDepth=[0,1];
  mf.placeholderSymbol='□';
}
