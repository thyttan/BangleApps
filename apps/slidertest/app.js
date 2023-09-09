{
Bangle.setLCDTimeout(0) // Easier to read the screen while developing.

//// Drawing operations

Bangle.loadWidgets(); // So appRect takes widgets into account.
let R = Bangle.appRect;

let draw = (rect)=>{
  g.reset();
  if (rect) g.setClipRect(rect.x1, rect.y1, rect.x2, rect.y2);
  g.setColor(1,0,0).fillRect(0,0,176,176);
  g.reset();
  Bangle.drawWidgets();
};

let blink = ()=>{setTimeout(()=>{
g.reset().setColor(0,1,0).fillRect(R.x2/2-5,R.y2/2-5,R.x2/2+5,R.y2/2+5);
setTimeout(()=>{g.reset().setColor(1,0,0).fillRect(R.x2/2-5,R.y2/2-5,R.x2/2+5,R.y2/2+5);},100);},0);
};

//// Functional logic

// callback is used with sliderObject
let callback = (mode,fb)=>{
  if (mode =="map") Bangle.musicControl({cmd:"vs",extra:Math.round(100*fb/30)}); // vs = Volume Set level
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

// callback2 is used with sliderObject2
let callback2 = (mode,fb)=>{
  currentLevel = fb;
  if (mode =="map") Bangle.musicControl({cmd:"seek",extra:fb});
  //print(process.memory().usage);
  //print("#drag handlers: " + Bangle["#ondrag"].length)
};

// SliderObject controls volume level on the android device.
let sliderObject=require("SliderInput").interface(
    callback,
    {useMap:true, steps:audioLevels.u, currLevel:audioLevels.c, horizontal:false, rounded:false, height: R.h-21, timeout:0.5, propagateDrag:true}
  );

// SliderObject2 follows the media track playing on the android device.
let sliderObject2;
let initSlider2 = ()=>{
  sliderObject2 = require("SliderInput").interface(
      callback2,
      {useMap:false, steps:trackDur, currLevel:trackPosition, horizontal:true, rounded:false, timeout:0, useIncr:false, immediateDraw:false, propagateDrag:true, width:Math.round(R.w/20), xStart:R.x2-R.w/20-4, oversizeR:10, oversizeL:10, autoProgress:true, yStart: R.x+4, height: R.w-8}
    );
  sliderObject2.f.draw(sliderObject2.v.level);
  if (trackState==="play") sliderObject2.f.startAutoUpdate();
  }

let init = ()=> {
  draw();
  initSlider2();
}

// Get audio levels from Android device
let audioLevels = {u:30, c:15}; // Init with values to avoid "Uncaught Error: Cannot read property 'u' of undefined" if values were not gathered from Gadgetbridge.
let audioHandler = (e)=>{audioLevels = e;print(audioLevels);};
Bangle.on('audio', audioHandler);
Bangle.musicControl("vg"); // vg = Volume Get level

// Handle music messages
// Bangle.emit("message", type, msg);
let trackPosition = 0;
let trackDur = 30;
let trackState = "pause";
let messageHandler = (type, msg)=>{
  print("\n","type:"+type, "t:"+msg.t, "src:"+msg.src, "mode:"+msg.state, "pos:"+msg.position, "dur:"+msg.dur);
  if (type==='music' && msg.src=="musicstate") {
    trackState = msg.state;
    trackPosition = msg.position + (trackState==="play"?1:0); // +1 to account for latency.
    trackDur = msg.dur;
    if (sliderObject2) {
        sliderObject2.f.stopAutoUpdate();
        sliderObject2.f.remove();
        initSlider2();
      }
    blink() // Indicate when a message arrives.
  }
}
Bangle.on('message', messageHandler);

let ebLast = 0; // Used for fix/Hack needed because there is a timeout before the slider is called upon.
Bangle.on('drag', (e)=>{
  if (ebLast==0) {
    Bangle.musicControl("vg"); // vg = Volume Get level
    if (e.y<140 && !sliderObject.v.dragActive) {
      setTimeout(()=>{ // Timeout so gadgetbridge has time to send back volume levels.
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

init();

//print("#drag handlers: " + Bangle["#ondrag"].length)
}
