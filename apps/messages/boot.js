(function() {
  // Handle incoming messages while the app is not loaded
  // The messages app overrides Bangle.messageListener

  Bangle.messageListener = function(type, msg) {
    let ml = Bangle.messageListener;
    /**
     * Quietly load the app for music/map, if not already loading
     */
    function loadQuietly() {
      ml.loadTimeout = setTimeout(function() {
        load("messages.app.js");
      }, 500);
    }

    switch(type) {
      case "alarm":
      case "call":
        // load immediately: we want to handle this as soon as possible
        if (msg.t!=="remove") load("messages.app.js");
        return;

      case "music":
        if (!Bangle.CLOCK) return;
        if ("undefined"=== typeof ml.openMusic) {
          // only read settings file for first music message
          ml.openMusic = !!((require("Storage").readJSON("messages.settings.json", true) || {}).openMusic);
        }
        if (!ml.openMusic) return; // we don't care about music
        ml.music = Object.assign({}, ml.music, msg); // combine state and info messages
        // only load app if we are playing, and we know which track
        if (ml.music.state==="play" && ml.music.track) {
          require("messages").append(ml.music); // the library doesn't automatically write these to storage
          loadQuietly();
        }
        return;

      case "map":
        if (msg.t!=="remove" && Bangle.CLOCK) loadQuietly(msg);
        return;

      case "text":
        if (msg.t!=="add" || !msg.new || !(Bangle.CLOCK || msg.important)) return; // not important enough to load the app

        // after a delay load the app, to ensure we have all the messages
        if (ml.loadTimeout) clearTimeout(ml.loadTimeout);
        ml.loadTimeout = setTimeout(function() {
          ml.loadTimeout = undefined;
          // if we're in a clock or it's important, go straight to messages app
          if (Bangle.CLOCK || msg.important) return load("messages.app.js");
        }, 500);

      // case "eraseAll": do nothing
    }
  };
  Bangle.on("message", Bangle.messageListener);
})();