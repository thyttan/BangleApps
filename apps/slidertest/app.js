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
    if (progressBar) {
        progressBar.f.stopAutoUpdate();
        progressBar.f.remove();
        initProgressBar();
      }
    blink() // Indicate when a message arrives.
  }
}
Bangle.on('message', messageHandler);

// cbVolumeSlider is used with volumeSlider
let cbVolumeSlider = (mode,fb)=>{
  if (mode =="map") Bangle.musicControl({cmd:"vs",extra:Math.round(100*fb/30)}); // vs = Volume Set level
  if (mode =="incr") Bangle.musicControl(fb>0?"volumedown":"volumeup");
  if (mode =="remove") {
    audioLevels.c = fb;
    ebLast = 0;
    draw(volumeSlider.c.r);
    //progressBar.f.draw(progressBar.v.level);
    print(process.memory().usage);
    print("#drag handlers: " + Bangle["#ondrag"].length)
  }
};

// cbProgressbar is used with progressBar
let cbProgressbar = (mode,fb)=>{
  currentLevel = fb;
  if (mode =="map") Bangle.musicControl({cmd:"seek",extra:fb});
  //print(process.memory().usage);
  //print("#drag handlers: " + Bangle["#ondrag"].length)
};

// volumeSlider controls volume level on the android device.
let volumeSlider=require("Slider").create(
    cbVolumeSlider,
    {useMap:true, steps:audioLevels.u, currLevel:audioLevels.c, horizontal:false, rounded:false, height: R.h-21, timeout:0.5, propagateDrag:true}
  );

// progressBar follows the media track playing on the android device.
let progressBar;
let initProgressBar = ()=>{
  progressBar = require("Slider").create(
      cbProgressbar,
      {useMap:false, steps:trackDur, currLevel:trackPosition, horizontal:true, rounded:false, timeout:0, useIncr:false, immediateDraw:false, propagateDrag:true, width:Math.round(R.w/20), xStart:R.x2-R.w/20-4, oversizeR:10, oversizeL:10, autoProgress:true, yStart: R.x+4, height: R.w-8}
    );
  progressBar.f.draw(progressBar.v.level);
  if (trackState==="play") progressBar.f.startAutoUpdate();
  }

let init = ()=> {
  draw();
  initProgressBar();
}

let ebLast = 0; // Used for fix/Hack needed because there is a timeout before the slider is called upon.
Bangle.on('drag', (e)=>{
  if (ebLast==0) {
    Bangle.musicControl("vg"); // vg = Volume Get level
    if (e.y<140 && !volumeSlider.v.dragActive) {
      setTimeout(()=>{ // Timeout so gadgetbridge has time to send back volume levels.
        volumeSlider.c.steps=audioLevels.u;
        volumeSlider.v.level=audioLevels.c;
      },200);
      volumeSlider.v.dy = 0;
      Bangle.prependListener('drag', volumeSlider.f.dragSlider);
    }
    if (e.y>=140 && !progressBar.v.dragActive) {
      Bangle.prependListener('drag',progressBar.f.dragSlider);
    }
  }
  ebLast = e.b;
}
);

init();

//print("#drag handlers: " + Bangle["#ondrag"].length)
}
