// upload to ram via espruino web ide while in development.
// TODO:
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

    const DIAL_RECT = options.dialRect || {
      x: 0, y: 0, x2: g.getWidth()-1, y2: g.getHeight()-1,
      w: g.getWidth(), h: g.getHeight()
    };
    const ORIGO = { x: DIAL_RECT.x + DIAL_RECT.w / 2, y: DIAL_RECT.y + DIAL_RECT.h / 2 };

    const BASE_RECT_W = 176; // Bangle.js 2 screen pixel width.
    const STEPS_PER_WHOLE_TURN = options.stepsPerWholeTurn || 10;
    const THRESHOLD = 50 * (10 / STEPS_PER_WHOLE_TURN) * (DIAL_RECT.w / BASE_RECT_W); // baseThreshold * stepsPerWholeTurnScaling * rectangeScaling.

    const DRAG_HANDLER = function (e) {
      "ram"

      if (!(e.y >= DIAL_RECT.y && e.y <= DIAL_RECT.y2 &&
        e.x >= DIAL_RECT.x && e.x <= DIAL_RECT.x2)) { return; }

      if (e.y < ORIGO.y) { cumulativeDxPlusDy += e.dx; } else { cumulativeDxPlusDy -= e.dx; }
      if (e.x < ORIGO.x) { cumulativeDxPlusDy -= e.dy; } else { cumulativeDxPlusDy += e.dy; }

      let onStep = (step) => {
        Bangle.buzz(20, 0.2)
        cumulativeDxPlusDy -= THRESHOLD * step;
        cb(step);
      }

      if (cumulativeDxPlusDy > THRESHOLD) {
        onStep(1);
      }
      if (cumulativeDxPlusDy < -THRESHOLD) {
        onStep(-1);
      }

      E.stopEventPropagation();
    }

    Bangle.prependListener("drag", DRAG_HANDLER);
  }

  // Trying it out:
  dial(callback, {
    stepsPerWholeTurn: 15/*, dialRect: {
      x: 0, y: 0, x2: g.getWidth() / 2, y2: g.getHeight() / 2,
      w: g.getWidth() / 2, h: g.getHeight() / 2
    }*/
  });
}


