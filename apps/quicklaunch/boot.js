{
  Bangle.load = (o => (name) => {
    o(name);
    Bangle.emit("fastload",name);
  })(Bangle.load);


  const onClockEvalQuicklauch = ()=>{
    setTimeout(() => {
      if (Bangle.CLOCK)
        eval(require("Storage").read("quicklaunch.eval.js"))
    }, 0); // 0 second timeout makes sure we look at Bangle.CLOCK after it's set by an app.
  }

  Bangle.on("fastload", onClockEvalQuicklauch);

  onClockEvalQuicklauch() // On boot, load in quicklaunch after the clock face finished.
}
