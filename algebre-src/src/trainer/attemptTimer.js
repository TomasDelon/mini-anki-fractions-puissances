function safeMs(value){
  return Number.isFinite(value)?Math.max(0,value):0;
}

export function createAttemptTimer(options={}){
  const now=typeof options.now==='function'?options.now:()=>Date.now();
  let accumulated=safeMs(options.elapsedMs);
  let runningSince=options.running===false?null:now();

  function elapsed(){
    if(runningSince===null)return accumulated;
    return accumulated+Math.max(0,now()-runningSince);
  }

  function pause(){
    if(runningSince===null)return accumulated;
    accumulated=elapsed();
    runningSince=null;
    return accumulated;
  }

  function resume(){
    if(runningSince!==null)return elapsed();
    runningSince=now();
    return accumulated;
  }

  function reset(elapsedMs=0){
    accumulated=safeMs(elapsedMs);
    runningSince=now();
    return accumulated;
  }

  function snapshot(){
    return Object.freeze({elapsedMs:Math.round(elapsed()),running:runningSince!==null});
  }

  return Object.freeze({elapsed,pause,resume,reset,snapshot});
}
