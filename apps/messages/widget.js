WIDGETS["messages"] = {
  area: "tl", width: 0, iconwidth: 24,
  draw: function() {
    // If we had a setTimeout queued from the last time we were called, remove it
    if (WIDGETS["messages"].i) {
      clearTimeout(WIDGETS["messages"].i);
      delete WIDGETS["messages"].i;
    }
    Bangle.removeListener("touch", this.touch);
    if (!this.width) return;
    const c = (Date.now()-this.t)/1000;
    g.reset().clearRect(this.x, this.y, this.x+this.width, this.y+this.iconwidth);
    if (this.status==="new") {
      g.drawImage((c&1)
          ? atob("GBiBAAAAAAAAAAAAAAAAAAAAAB//+DAADDAADDAADDwAPD8A/DOBzDDn/DA//DAHvDAPvjAPvjAPvjAPvh///gf/vAAD+AAB8AAAAA==")
          : atob("GBiBAAAAAAAAAAAAAAAAAAAAAB//+D///D///A//8CP/xDj/HD48DD+B8D/D+D/3vD/vvj/vvj/vvj/vvh/v/gfnvAAD+AAB8AAAAA==")
        , this.x, this.y);
      let settings = require("Storage").readJSON("messages.settings.json", true) || {};
      if (settings.repeat===undefined) settings.repeat = 4;
      if (c<120 && (Date.now()-this.l)>settings.repeat*1000) {
        this.l = Date.now();
        WIDGETS["messages"].buzz(); // buzz every 4 seconds
      }
      WIDGETS["messages"].i = setTimeout(() => WIDGETS["messages"].draw(), 1000);
    } else { // only old messages: no blinking
      g.drawImage(
        // TODO: find better icon (more similar to other two above)
        atob("GBiBAAAAAAAAAAAAAAAAAB//+D///DAADDgAHDwAPDcA7DPDzDDnDDA8DDAYDDAADDAADDAADDAADD///B//+AAAAAAAAAAAAAAAAA==")
        , this.x, this.y);
    }
    if (process.env.HWVERSION>1) Bangle.on("touch", this.touch);
  }, show: function(quiet) {
    WIDGETS["messages"].t = Date.now(); // first time
    WIDGETS["messages"].l = Date.now()-10000; // last buzz
    if (quiet) WIDGETS["messages"].t -= 500000; // if quiet, set last time in the past so there is no buzzing
    WIDGETS["messages"].width = this.iconwidth;
    Bangle.drawWidgets();
    Bangle.setLCDPower(1);// turns screen on
  }, hide: function() {
    delete WIDGETS["messages"].t;
    delete WIDGETS["messages"].l;
    WIDGETS["messages"].width = 0;
    Bangle.drawWidgets();
  }, buzz: function() {
    if (WIDGETS["messages"].b) return;
    if ((require("Storage").readJSON("setting.json", 1) || {}).quiet) return; // never buzz during Quiet Mode
    require("buzz").pattern((require('Storage').readJSON("messages.settings.json", true) || {}).vibrate || ".");
  }, touch: function(b, c) {
    const w = WIDGETS["messages"];
    if (!w || !w.width || c.x<w.x || c.x>w.x+w.width || c.y<w.y || c.y>w.y+w.iconwidth) return;
    load("messages.app.js");
  }, listener: function(type, msg) {
    const w = WIDGETS["messages"];
    switch(type) {
      case "text":
        if (msg.t==="add" && msg.new && (Bangle.CLOCK || msg.important)) return; // no need: boot will be loading the app anyway
        if (msg.t==="remove") w.status = require("messages").status();
        else if (msg.new || w.status==="new") w.status = "new";
        else if (w.status==="none") w.status = "old";
        if (w.status==="new" || (w.status==="old" && (require("Storage").readJSON("messages.settings.json", true) || {}).showRead)) w.show();
        else w.hide();
        return;
      case "eraseAll":
        w.status = "none";
        return w.hide();
    }
  }
};

if (global.MESSAGES===undefined) {
  (function() {
    const s = require("messages").status();
    WIDGETS["messages"].status = s;
    if (s==="new" || (s==="old" && (require("Storage").readJSON("messages.settings.json", true) || {}).showRead)) {
      WIDGETS["messages"].show(true);
    }
    Bangle.on("message", WIDGETS["messages"].listener);
  })();
}
