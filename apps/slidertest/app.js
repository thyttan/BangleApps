{
  let setDevMode = ()=>{
    Bangle.setLCDTimeout(0); // Easier to read the screen while developing.
    Bangle.setLocked(false);
    Bangle.setLCDBrightness(0.6);
    Bangle.setLCDPower(true);
  };
  setDevMode();

  //// Drawing operations

  Bangle.loadWidgets(); // So appRect takes widgets into account.
  let R = Bangle.appRect;

  let backDropColor = [1,0,0];

  let draw = (rect)=>{
    g.reset();
    if (rect) g.setClipRect(rect.x1, rect.y1, rect.x2, rect.y2);
    g.setColor(backDropColor[0],backDropColor[1],backDropColor[2]).fillRect(0,0,176,176);
    g.setColor(1,1,1).drawLine(xA, R.y, xA, yA).drawLine(xB, R.y, xB, yA);
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
      blink(); // Indicate when a message arrives.
    }
  };
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
      print("#drag handlers: " + Bangle["#ondrag"].length);
    }
  };

  let cbColorSlider = (mode,fb)=>{
    if (mode =="incr") {
      let l = colorSlider.v.level;
      print("color mode: " + l);
      if (l===0) backDropColor = [1,0,0];
      if (l===1) backDropColor = [0.75,0.25,0];
      if (l===2) backDropColor = [0.5,0.5,0];
      if (l===3) backDropColor = [0.25,0.75,0];
      if (l===4) backDropColor = [0,1,0];
      if (l===5) backDropColor = [0,0.75,0.25];
      if (l===6) backDropColor = [0,0.5,0.5];
      if (l===7) backDropColor = [0,0.25,0.75];
      if (l===8) backDropColor = [0,0,1];
      g.setColor(backDropColor[0],backDropColor[1],backDropColor[2]).fillRect(xA+1,R.y,xB-1,yA);
    }
    if (mode =="remove") {
      init();
    }
  };

  let cbBrightnessSlider = (mode,fb)=>{
    if (mode =="map") Bangle.setLCDBrightness(fb/100);
    if (mode =="remove") {

    }
  };

  // cbProgressbar is used with progressBar
  let cbProgressbar = (mode,fb)=>{
    currentLevel = fb;
    if (mode =="map") Bangle.musicControl({cmd:"seek",extra:fb});
    //print(process.memory().usage);
    //print("#drag handlers: " + Bangle["#ondrag"].length)
  };

  let xA = R.x+4*R.w/8;
  let xB = R.x+11*R.w/16;
  let yA = R.x2-Math.round(R.w/20)-5;

  // volumeSlider controls volume level on the android device.
  let volumeSlider=require("Slider").create(
    cbVolumeSlider,
    {useMap:true, steps:audioLevels.u, currLevel:audioLevels.c, horizontal:false, rounded:false, height:R.h-21, timeout:0.5, propagateDrag:true, xStart:R.x+4, dragRect:{x:R.x, y:0, x2:xA-1, y2: R.y2}}
  );

  // colorSlider controls the background color of this app.
  let colorSlider = require("Slider").create(
    cbColorSlider,
    {useIncr:true, useMap:false, steps:8, drawableSlider:false, xStart: R.x2-2*R.w/4, height:R.h-21, currLevel:0, propagateDrag:true, timeout:0, dragRect:{x:xA, y:0, x2:xB-1, y2: R.y2}}
  );

  // brightnessSlider controls the brightness of the Bangle.js
  let brightnessSlider = require("Slider").create(
    cbBrightnessSlider,
    {useIncr:false, useMap:true, steps:100, height:R.h-21, timeout:0, currLevel:100*0.2, propagateDrag:true, dragRect:{x:xB, y:0, x2:R.x2, y2: R.y2}}
  );

  // progressBar follows the media track playing on the android device.
  let progressBar;
  let initProgressBar = ()=>{
    progressBar = require("Slider").create(
      cbProgressbar,
      {dragableSlider:false, useMap:false, steps:trackDur, currLevel:trackPosition, horizontal:true, rounded:false, timeout:0, useIncr:false, immediateDraw:false, propagateDrag:true, width:Math.round(R.w/20), xStart:R.x2-R.w/20-4, oversizeR:10, oversizeL:10, autoProgress:true, yStart: R.x+4, height: R.w-8}
    );
    progressBar.f.draw(progressBar.v.level);
    if (trackState==="play") progressBar.f.startAutoUpdate();
  };

  let init = ()=> {
    draw();
    initProgressBar();
    brightnessSlider.f.draw(brightnessSlider.v.level);
  };

  let isAnySliderDragActive = ()=>{
    return (volumeSlider.v.dragActive || brightnessSlider.v.dragActive || colorSlider.v.dragActive || progressBar.v.dragActive);
  };

  let ebLast = 0; // Used for fix/Hack needed because there is a timeout before the slider is called upon.
  Bangle.on('drag', (e)=>{
    if (ebLast==0) {
      //  if (!isAnySliderDragActive()) {
      if (e.y<yA) {
        if (e.x<xA && !volumeSlider.v.dragActive) {
          Bangle.musicControl("vg"); // vg = Volume Get level
          setTimeout(()=>{ // Timeout so gadgetbridge has time to send back volume levels.
            volumeSlider.c.steps=audioLevels.u;
            volumeSlider.v.level=audioLevels.c;
          },200);
          Bangle.prependListener('drag', volumeSlider.f.dragSlider);
        }
        if (e.x>=xA && e.x<xB && !colorSlider.v.dragActive) {
          Bangle.prependListener('drag', colorSlider.f.dragSlider);
        }
        if (e.x>=xB && !brightnessSlider.v.dragActive) {
          Bangle.prependListener('drag', brightnessSlider.f.dragSlider);
        }
      }
      if (e.y>=yA) {
        progressBar.f.dragSlider&&Bangle.prependListener('drag',progressBar.f.dragSlider);
      }
      //  }
    }
    ebLast = e.b;
  });

  init();

  //print("#drag handlers: " + Bangle["#ondrag"].length)
}
