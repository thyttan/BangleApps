{
let callback = (mode,fb)=>{
  if (mode =="map") Bangle.musicControl({cmd:"volumesetlevel",extra:Math.round(100*fb/30)});
  if (mode =="incr") Bangle.musicControl(fb>0?"volumedown":"volumeup");
  if (mode =="remove") {
    audioLevels.c = fb;
    ebLast = 0;
    draw(sliderObject.c.r);
    //sliderObject2.f.draw(sliderObject2.v.level);
    print(process.memory().usage);
    print("#drag handlers: " + Bangle["#ondrag"].length)
  }
};

let callback2 = (mode,fb)=>{
  currentLevel = fb;
  print(process.memory().usage);
  print("#drag handlers: " + Bangle["#ondrag"].length)
};

let currentLevel = 10;

let R = Bangle.appRect;

let draw = (rect)=>{
  g.reset();
  if (rect) g.setClipRect(rect.x1, rect.y1, rect.x2, rect.y2);
  g.setColor(1,0,0).fillRect(0,0,176,176);
  g.reset();
};

let sliderObject2;
let init = ()=> {
  draw();
  sliderObject2 = require("SliderInput").interface(
      callback2,
      {useMap:true, steps:30, currLevel:currentLevel, horizontal:true, rounded:false, timeout:0, useIncr:false, immediateDraw:false, propagateDrag:true, width:Math.round(Bangle.appRect.w/20), xStart:R.x2-R.w/20-4, oversizeR:10, oversizeL:10, autoProgress:true}
    );
  sliderObject2.f.draw(sliderObject2.v.level);
  sliderObject2.f.startAutoUpdate();
}

let audioLevels = {u:30, c:15}; // Init with values to avoid "Uncaught Error: Cannot read property 'u' of undefined" if values were not gathered from Gadgetbridge.
let audioHandler = (e)=>{audioLevels = e;};
Bangle.on('audio', audioHandler);
Bangle.musicControl("volumegetlevel");

init();

let ebLast = 0; // Used for fix/Hack needed because there is a timeout before the slider is called upon.
let sliderObject=require("SliderInput").interface(
    callback,
    {useMap:true, steps:audioLevels.u, currLevel:audioLevels.c, horizontal:false, rounded:false, height: R.h-21, timeout:0.5, propagateDrag:true}
  );

Bangle.on('drag', (e)=>{
  if (ebLast==0) {
    Bangle.musicControl("volumegetlevel");
    if (e.y<140 && !sliderObject.v.dragActive) {
      setTimeout(()=>{
        sliderObject.c.steps=audioLevels.u;
        sliderObject.v.level=audioLevels.c;
      },200);
      sliderObject.v.dy = 0;
      Bangle.prependListener('drag', sliderObject.f.dragSlider);
    }
    if (e.y>=140 && !sliderObject2.v.dragActive) {
      Bangle.prependListener('drag',sliderObject2.f.dragSlider);
    }
  }
  ebLast = e.b;
}
);
print("#drag handlers: " + Bangle["#ondrag"].length)
}
