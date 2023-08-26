{
let callback = (mode,fb)=>{
  if (mode =="map") Bangle.musicControl({cmd:"volumesetlevel",extra:Math.round(100*fb/30)});
  if (mode =="incr") Bangle.musicControl(fb>0?"volumedown":"volumeup");
  if (mode =="remove") {audioLevels.c = fb; ebLast = 0; draw();}
};

let draw = ()=>{
  g.reset().clear().setColor(1,0,0).fillRect(0,0,176,176);
};
draw();

let audioLevels = {u:30, c:15}; // Init with values to avoid "Uncaught Error: Cannot read property 'u' of undefined" if values were not gathered from Gadgetbridge.
let audioHandler = (e)=>{audioLevels = e;};
Bangle.on('audio', audioHandler);
Bangle.musicControl("volumegetlevel");

let ebLast = 0; // Used for fix/Hack needed because there is a timeout before the slider is called upon.
Bangle.on('drag', (e)=>{
  if (ebLast==0) {
  Bangle.musicControl("volumegetlevel");
  if (e.y>130) {
    setTimeout(()=>{require("SliderInput").interface(callback, {useMap:true, steps:audioLevels.u, currLevel:audioLevels.c, horizontal:true});},200);
  } else {
    setTimeout(()=>{require("SliderInput").interface(callback, {useMap:true, steps:audioLevels.u, currLevel:audioLevels.c, horizontal:false});},200);
  }
  }
  ebLast = e.b;
}
);
}
