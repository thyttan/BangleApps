{
  const R = Bangle.appRect;
  //g.clearRect(R); // clear immediately to increase perceived snappiness.

  const storage = require("Storage");
  let settings = storage.readJSON("quicklaunch.json", true) || {};
  let trace = ""; // = (settings[settings.trace+"app"].src=="quicklaunch.app.js") ? settings.trace : settings.trace.substring(0, settings.trace.length-1); // If the stored trace leads beyond extension screens, walk back to the last extension screen. Compatibility with "Fastload Utils" App History feature.

  const draw = () => {
    // Draw app hints
    g.reset().clearRect(R).setFont("Vector", 11)
      .setFontAlign(0,1,3).drawString(settings[trace+"lapp"].name, R.x2, R.y+R.h/2)
      .setFontAlign(0,1,1).drawString(settings[trace+"rapp"].name, R.x, R.y+R.h/2)
      .setFontAlign(0,1,0).drawString(settings[trace+"uapp"].name, R.x+R.w/2, R.y2)
      .setFontAlign(0,-1,0).drawString(settings[trace+"dapp"].name, R.x+R.w/2, R.y)
      .setFontAlign(0,0,0).drawString(settings[trace+"tapp"].name, R.x+R.w/2, R.y+R.h/2);
  };
  //draw(); // draw asap to increase perceived snappiness.
  //print(settings);

  let leaveTrace = function(trace) {
    if (settings[trace+"app"].name != "") {
      settings.trace = trace;
    } else { trace = trace.substring(0, trace.length-1); }
    return trace;
  };

  const onFastloadNotFromQuicklaunch = ()=>{
    saveAndClear();
  }

  Bangle.on("fastload", onFastloadNotFromQuicklaunch)

  let launchApp = function(trace) {
    if (trace.length==1 && Bangle.uiRemove) { // Unload the clock.
      Bangle.uiRemove()
      Bangle.uiRemove = null;
    }
    updateTimeoutToClock();

    if (settings[trace+"app"] && settings[trace+"app"].src) {
      if (settings[trace+"app"].name == "Extension") {
        draw();
      } else {
        // Unload quicklaunch when we load a new app, if previous app had a
        // remove handler. Don't add remove handle if the previous app was not
        // fastload compatible, as that would lead to ram leaks. Instead let
        // it go through a regular load:

        print(Bangle.uiRemove);
        print(saveAndClear);

        if (Bangle.uiRemove===null) Bangle.uiRemove = saveAndClear;
        if (settings[trace+"app"].name == "Show Launcher") Bangle.showLauncher()
          else if (!storage.read(settings[trace+"app"].src)) {
            E.showMessage(settings[trace+"app"].src+"\n"+/*LANG*/"was not found"+".", "Quick Launch");
            settings[trace+"app"] = {"name":"(none)"}; // reset entry.
          } else load(settings[trace+"app"].src);

      }
    }
  };

  let touchHandler = (_,e) => {
    //if (!Bangle.CLOCK) return;
    if (Bangle.CLKINFO_FOCUS) return;
    if (e.type == 2) return;
    let R = Bangle.appRect;
    if (e.x < R.x || e.x > R.x2 || e.y < R.y || e.y > R.y2 ) return;
    trace = leaveTrace(trace+"t"); // t=tap.
    launchApp(trace);
  };

  let swipeHandler = (lr,ud) => {
    //if (!Bangle.CLOCK) return;
    if (Bangle.CLKINFO_FOCUS) return;
    if (lr == -1) trace = leaveTrace(trace+"l"); // l=left, 
    if (lr == 1) trace = leaveTrace(trace+"r"); // r=right,
    if (ud == -1) trace = leaveTrace(trace+"u"); // u=up,
    if (ud == 1) trace = leaveTrace(trace+"d"); // d=down.
    launchApp(trace);
  };

  let onLongTouchDoPause = (e)=>{
    if (e.b == 1 && timeoutToClock) {clearTimeout(timeoutToClock); timeoutToClock = false;}
    if (e.b == 0 && !timeoutToClock) updateTimeoutToClock();
  };

  const registerHandlers = ()=>{
    Bangle.on("touch", touchHandler);
    Bangle.on("swipe", swipeHandler);
    Bangle.on("drag", onLongTouchDoPause);
  }
  registerHandlers();
  //Bangle.on("fastload", registerHandlers);

    // taken from Icon Launcher with some alterations
  let timeoutToClock;
  const updateTimeoutToClock = function(){
    let time = 1200; // milliseconds
    if (timeoutToClock) clearTimeout(timeoutToClock);
    timeoutToClock = setTimeout(()=>{
      Bangle.uiRemove = saveAndClear;
      Bangle.showClock();
    },time);
  };

  let saveAndClear = ()=> {
    trace = "";
    storage.writeJSON("quicklaunch.json", settings);
    E.removeListener("kill", saveAndClear);
    Bangle.removeListener("touch", touchHandler)
    Bangle.removeListener("swipe", swipeHandler)
    Bangle.removeListener("drag", onLongTouchDoPause)
    Bangle.removeListener("fastload", onFastloadNotFromQuicklaunch)
    if (timeoutToClock) clearTimeout(timeoutToClock); // Compatibility with Fastload Utils.
  };




  //const oldUiRemove = Bangle.uiRemove;
  //Bangle.uiRemove = ()=> {
  //  if (!!oldUiRemove) oldUiRemove();
  ////  Bangle.removeListener("touch", touchHandler)
  ////  Bangle.removeListener("swipe", swipeHandler)
  ////  Bangle.removeListener("drag", onLongTouchDoPause)
  //  saveAndClear();
  //};

  E.on("kill", saveAndClear)
}
