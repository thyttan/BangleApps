// widhide.boot.js

Bangle.widgetBuffer = Graphics.createArrayBuffer(g.getWidth(), 24, 8, {msb: true});
Bangle.widgetBuffer.shown = false;
Bangle.widgetBuffer.offset = -24;

Bangle.loadWidgets = (o => () => {
//  console.log('loadWidgets');
  o();
  if (Bangle.CLOCK) {
    Bangle.appRect = {
      // apps can use the complete screen now
      x: 0, y: 0,
      w: g.getWidth(), h: g.getHeight(),
      x2: g.getWidth()-1, y2: g.getHeight()-1,
    };
    Object.keys(WIDGETS).forEach(wi=>{
      var w = WIDGETS[wi];
      w.olddraw = w.draw;
      w.draw = function(){
        if (Bangle.widgetBuffer.shown) {
          let _g = g;
          g = Bangle.widgetBuffer;
          this.olddraw(this);
          g = _g;
          Bangle.setLCDOverlay(Bangle.widgetBuffer, 0, Bangle.widgetBuffer.offset);
        }
      };
    });
  }
})(Bangle.loadWidgets);

Bangle.drawWidgets = (o => () => {
  if (!Bangle.CLOCK) return o();
//  console.log('drawWidgets');
  if (Bangle.widgetBuffer.shown) {
    Bangle.widgetBuffer.clear(1);
    let _g = g;
    g = Bangle.widgetBuffer;
    o();
    g = _g;
    Bangle.setLCDOverlay(Bangle.widgetBuffer, 0, Bangle.widgetBuffer.offset);
  }
})(Bangle.drawWidgets);

Bangle.on("swipe", (_, d) => {
  if (!Bangle.CLOCK || !d) return; // not a clock, or horizontal swipe
  if (!Bangle.widgetBuffer) Bangle.drawWidgets();

  if (d>0 & !Bangle.widgetBuffer.shown) { // show widgets
    if (typeof WIDGETS != 'object') Bangle.loadWidgets();
    Bangle.widgetBuffer.shown = true;
    Bangle.widgetBuffer.offset = -24;
    Bangle.drawWidgets();
  } else if (d<0 & Bangle.widgetBuffer.shown){ // hide widgets
    Bangle.widgetBuffer.shown = false;
    Bangle.widgetBuffer.offset = 0;
  } else {
    return;
  }
  function anim() {
    Bangle.widgetBuffer.offset += d;
    Bangle.setLCDOverlay(Bangle.widgetBuffer, 0, Bangle.widgetBuffer.offset);
    if (Bangle.widgetBuffer.offset >= 0 || Bangle.widgetBuffer.offset <= -24) {
      clearTimeout(animTimeout);
      return;
    }
    animTimeout = setTimeout(anim, 1);
  }
  var animTimeout = setTimeout(anim, 1);
});