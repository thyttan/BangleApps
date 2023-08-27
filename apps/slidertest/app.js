{
let callback = (mode,fb)=>{
  if (mode =="map") Bangle.musicControl({cmd:"volumesetlevel",extra:Math.round(100*fb/30)});
  if (mode =="incr") Bangle.musicControl(fb>0?"volumedown":"volumeup");
  if (mode =="remove") {audioLevels.c = fb; ebLast = 0; draw();}
};
  
let callback2 = (mode,fb)=>{
  currentLevel = fb;
};

  let currentLevel = 10;

  let R = Bangle.appRect;
  
let draw = ()=>{
  g.reset().clear().setColor(1,0,0).fillRect(0,0,176,176);
};

let init = ()=> {
  draw();
  require("SliderInput").interface(callback2, {useMap:true, steps:30, currLevel:currentLevel, horizontal:true, rounded:false, timeout:false, useIncr:false, immediateDraw:false, propagateDrag:true, width:Math.round(Bangle.appRect.w/20), xStart:R.x2-R.w/20-4, oversizeR:10, oversizeL:10, autoProgress:true});
}


let audioLevels = {u:30, c:15}; // Init with values to avoid "Uncaught Error: Cannot read property 'u' of undefined" if values were not gathered from Gadgetbridge.
let audioHandler = (e)=>{audioLevels = e;};
Bangle.on('audio', audioHandler);
Bangle.musicControl("volumegetlevel");

init();

let ebLast = 0; // Used for fix/Hack needed because there is a timeout before the slider is called upon.
Bangle.on('drag', (e)=>{
  if (ebLast==0) {
  Bangle.musicControl("volumegetlevel");
  if (e.y<140) {
    setTimeout(()=>{require("SliderInput").interface(callback, {useMap:true, steps:audioLevels.u, currLevel:audioLevels.c, horizontal:false, rounded:false, height: R.h-21});},200);
  }
  }
  ebLast = e.b;
}
);
}
