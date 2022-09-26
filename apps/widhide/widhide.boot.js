// widhide.boot.js

Bangle.widgetsShown = false;
Bangle.widgetBuffer = Graphics.createArrayBuffer(g.getWidth(), 24, 8, {msb: true});

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
        if (Bangle.widgetsShown) {
          let _g = g;
          g = Bangle.widgetBuffer;
          this.olddraw(this);
          g = _g;
          Bangle.setLCDOverlay(Bangle.widgetBuffer, 0, 0);
        }
      };
    });
  }
})(Bangle.loadWidgets);

Bangle.drawWidgets = (o => () => {
  if (!Bangle.CLOCK) return o();
//  console.log('drawWidgets');
  if (Bangle.widgetsShown) {
    Bangle.widgetBuffer.clear(1);
    let _g = g;
    g = Bangle.widgetBuffer;
    o();
    g = _g;
    Bangle.setLCDOverlay(Bangle.widgetBuffer, 0, 0);
  }
})(Bangle.drawWidgets);

Bangle.on("swipe", (_, d) => {
  if (!Bangle.CLOCK || !d) return; // not a clock, or horizontal swipe
  if (!Bangle.widgetBuffer) Bangle.drawWidgets();

  if (d>0 & !Bangle.widgetsShown) {
//    console.log('Show widgets');
    if (typeof WIDGETS != 'object') Bangle.loadWidgets();
    Bangle.widgetsShown = true;
    Bangle.drawWidgets();
  } else if (d<0 & Bangle.widgetsShown){
//    console.log('Hide widgets');
    Bangle.widgetsShown = false;
    Bangle.setLCDOverlay();
  }
});