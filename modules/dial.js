// upload to ram via espruino web ide while in development.
// TODO:
// - [ ] make the ui agnostic to screen size
{

  let level = 0;

  let callback = (step) => {
    level += step;
    { //development
      print(step, level);
      g.clear().setFont("Vector:40").setFontAlign(0, 0).drawString(level, 85, 85);
    }
  }

  let dial = function (cb, options) {
    "ram"
    if (!options) { options = {}; }
    let cumulativeDxPlusDy = 0;

    let dialRect = options.dialRect || {
      x: 0, y: 0, x2: g.getWidth(), y2: g.getHeight(),
      w: g.getWidth() / 2, h: g.getHeight() / 2
    };

    let triggerDistance = 45; // TODO:  triggerDistance ->  45 * g.getWidth() / 176 . To remap to screens of different resolutions.

    let origo = { x: dialRect.x + dialRect.w / 2, y: dialRect.y + dialRect.h / 2 };
    let dragHandler = function (e) {
      "ram"

      if (!(e.y >= dialRect.y && e.y < dialRect.y2 &&
        e.x >= dialRect.x && e.x < dialRect.x2)) {return;}

      if (e.y < origo.y) { cumulativeDxPlusDy += e.dx; } else { cumulativeDxPlusDy -= e.dx; }
      if (e.x < origo.x) { cumulativeDxPlusDy -= e.dy; } else { cumulativeDxPlusDy += e.dy; }

      let onStep = (step) => {
        Bangle.buzz(20, 0.2)
        cumulativeDxPlusDy -= triggerDistance * step;
        cb(step);
      }

      if (cumulativeDxPlusDy > triggerDistance) {
        onStep(1);
      }
      if (cumulativeDxPlusDy < -triggerDistance) {
        onStep(-1);
      }

      E.stopEventPropagation();
    }

    Bangle.prependListener("drag", dragHandler);
  }

  dial(callback);
}


