// upload to ram via espruino web ide while in development.

{
  /*
Bangle.on('drag', function(event) { ... });
Parameters

event - Object of form {x,y,dx,dy,b} containing touch coordinates, difference in touch coordinates, and an integer b containing number of touch points (currently 1 or 0)


   */

let cumulativeDxPlusDy = 0;
let level = 0;
let dragHandler = function(e) { "ram"
    // Use cross product to decide if dialing down/left/screwing out or up/right/screwing in?
/*
    // Quadrants: (1 || 2 || 3 || 4)
    if ((e.dx>0&&e.dy>0) || (e.dx>0&&e.dy>0) || (e.dx>0&&e.dy>0) || (e.dx>0&&e.dy>0)) { //screwing into the screen - increase

    }

    if ((e.dx>0&&e.dy>0) || (e.dx>0&&e.dy>0) || (e.dx>0&&e.dy>0) || (e.dx>0&&e.dy>0)) { //screwing out of the screen - decrease

    }

*/

    const PREV_DX_PLUS_DY = cumulativeDxPlusDy;
    if (e.y<g.getHeight()/2 ) {
      cumulativeDxPlusDy += e.dx;
    } else {
      cumulativeDxPlusDy -= e.dx;
    }
    if (e.x<g.getWidth()/2 ) {
      cumulativeDxPlusDy -= e.dy;
    } else {
      cumulativeDxPlusDy += e.dy;
    }

    if (Math.abs(cumulativeDxPlusDy)<Math.abs(PREV_DX_PLUS_DY)) {
      cumulativeDxPlusDy = 0;
    }

    let onStep = (step)=>{
      if (step>0) {
      level ++;
      }
      if (step<0) {
      level --;
      }
      print(step, level);
      g.clear().setFont("Vector:40").setFontAlign(0,0).drawString(level, 85, 85);
      Bangle.buzz(20, 0.2)
      cumulativeDxPlusDy = 0;
    }

    if (cumulativeDxPlusDy > 50) {
      onStep(1);
    }
    if (cumulativeDxPlusDy < -50) {
      onStep(-1);
    }
 

  }

Bangle.on("drag", dragHandler);
}


