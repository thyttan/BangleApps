(function() {
  // Handle incoming messages while the app is not loaded
  // The messages app overrides Bangle.messageListener

  let music, openMusic, loadMessages, loadTimeout;
  Bangle.messageListener = function(type, msg) {
    /**
     * Quietly load the app for music/map, if not already loading
     */
    function loadQuietly() {
      loadTimeout = setTimeout(function() {
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
        if ("undefined"=== typeof openMusic) {
          // only read settings file for first music message
          openMusic = !!((require("Storage").readJSON("messages.settings.json", true) || {}).openMusic);
        }
        if (!openMusic) return; // we don't care about music
        music = Object.assign({}, music, msg); // combine state and info messages
        // load app if we are playing, and we know which track
        if (music.state==="play" && music.track) loadQuietly();
        return;

      case "map":
        if (msg.t!=="remove" && Bangle.CLOCK) loadQuietly(msg);
        return;

      case "text":
        if ((msg.t==="remove" || msg.t==="modify") && Math.random()>=0.8) {
          // perform housekeeping every so often
          require("messages").save(exports.load());
        }
        // ok, saved now - we only care if it's new
        if (msg.t!=="add" || !msg.new) return;
        // otherwise load messages/show widget
        if (Bangle.CLOCK || msg.important) loadMessages = true;
        // first, buzz
        const quiet = (require("Storage").readJSON("setting.json", 1) || {}).quiet;
        if (!quiet && loadMessages && global.WIDGETS && WIDGETS.messages) {
          WIDGETS.messages.buzz();
        }
        // after a delay load the app, to ensure we have all the messages
        if (loadTimeout) clearTimeout(loadTimeout);
        loadTimeout = setTimeout(function() {
          loadTimeout = undefined;
          // if we're in a clock or it's important, go straight to messages app
          if (loadMessages) return load("messages.app.js");
          if (!quiet && (!global.WIDGETS || !WIDGETS.messages)) return Bangle.buzz(); // no widgets - just buzz to let someone know
          WIDGETS.messages.show();
        }, 500);

      // case "eraseAll": do nothing
    }
  };
  Bangle.on("message", Bangle.messageListener);
})();