/**
 * Events look like this:
 *   {t:"add",id:int, src,title,subject,body,sender,tel, important:bool, new:bool}
 *   {t:"add",id:int, id:"music", state, artist, track, etc} // add new
 *   {t:"remove",id:int} // remove
 *   {t:"modify",id:int, title:string} // modified
 */

/**
 * Load saved events
 * @returns {object[]}
 */
exports.load = function() {
  // start with contents of old file (if it still exists)
  let events = (require("Storage").readJSON("messages.json", 1) || []).reverse(); // newest message is first in array, but last in StorageFile
  const f = require("Storage").open("messages.jsonl", "r");
  let e, l, ids = {}, idx; // keep a list of id=>index
  while((l = f.readLine())!==undefined) {
    e = JSON.parse(l);
    idx = ids[e.id];
    let action = e.t;
    if (["call", "music", "map"].includes(e.id) && action!=="remove") {
      action = "add"; // remove previous, and add this to end of list
    }
    switch(action) {
      case "remove":
        if (idx!==undefined) {
          events[idx] = null; // we filter() these out later, this preserves indices for ids[] lookup
          delete ids[e.id];
        }
        break;
      case "modify":
        if (idx!==undefined) {
          // update existing event
          Object.assign(events[idx], e);
          break;
        }
      // not found: fall through and add as new
      case "add":
        if (idx!==undefined) {
          // duplicate ids, happens deliberately for music/Maps
          events[idx] = null;
        }
        if (e.id) ids[e.id] = events.length;
        events.push(e);
        break;
      default:
        throw `Invalid event action "${action}"`;
    }
  }
  return events.filter(e => e).reverse(); // newest message comes last in StorageFile, but should be first in array
};

/**
 * Check if there are any messages
 * @returns {string} "new"/"old"/"none"
 */
exports.status = function() {
  try {
    const n = e => (e.new && !["music", "Maps"].includes(e.id));
    let messages;
    if ("undefined"!== typeof MESSAGES) messages = MESSAGES;
    else messages = exports.load();
    if (!messages.length) return "none";
    return messages.some(n) ? "new" : "old";
  } catch(e) {
    return false; // don't bother e.g. the widget with errors
  }
};

/**
 * Append message to storage file
 * @param {object} event
 */
function append(event) {
  if (event.t==="remove") event = {t: "remove", id: event.id}; // we only need the id
  require("Storage").open("messages.jsonl", "a")
    .write(JSON.stringify(event)+"\n");
}
/**
 * Save messages to storage file
 * @param {object[]} events
 */
exports.save = function(events) {
  require("Storage").erase("messages.json"); // clean up old file
  require("Storage").open("messages.jsonl", "w").erase();
  events.reverse().forEach(append); // newest message is first in array, but last in file
};

/**
 * Push a new message onto messages queue
 * @param {object} event
 */
exports.pushMessage = function(event) {
  if (exports.debug === undefined) exports.debug = !!((require("Storage").readJSON("messages.settings.json", true) || {}).debugLog);
  if (exports.debug) require("Storage").open("messages.debug", "a").write(`${(new Date).toJSON().slice(0, -5)} ${JSON.stringify(event)}`+"\n");
  const inApp = "undefined"!== typeof MESSAGES;
  if (event.t==="add" && event.new===undefined) { // If 'new' has not been set yet, set it
    event.new = true; // Assume it should be new
  } else if (event.t==="remove") {
    if (event.id===undefined) return; // we can't handle this
  }

  // incoming call
  if (event.id==="call") {
    if (inApp) return onCall(event);
    if (event.t!=="remove") event.load = true;
    append(event);
    // load immediately: we want to handle this as soon as possible
    if (event.t!=="remove") load("messages.app.js");
    return;
  }

  /**
   * Quietly load the app for music/map, if not already loading
   */
  function loadQuietly() {
    if (!exports.loadTimeout && (Bangle.CLOCK || event.important)) {
      exports.loadTimeout = setTimeout(function() {
        load("messages.app.js");
      }, 500);
    }
  }

  // music update
  if (event.id==="music") {
    if (inApp) return onMusic(event);
    if (!Bangle.CLOCK) return; // only load music from a clock
    if ("undefined"=== typeof exports.openMusic) {
      // only read settings file for first music message
      exports.openMusic = !!((require("Storage").readJSON("messages.settings.json", true) || {}).openMusic);
    }
    if (!exports.openMusic) return; // we don't care about music
    if (!exports.music) exports.music = {};
    Object.assign(exports.music, event); // combine state and info messages
    // load app if we are playing, and we know which track
    if (exports.music.state==="play" && exports.music.track) {
      exports.music.load = true;
      append(exports.music);
      loadQuietly();
    }
    return;
  }

  // map update
  if (event.src==="Maps") event.id = "map"; // lump these all together
  if (event.id==="map") {
    if (inApp) return onMap(event);
    if (event.t!=="remove" && (Bangle.CLOCK || event.important)) {
      event.load = true;
      append(event);
      loadQuietly();
    } else {
      append(event);
    }
    return;
  }

  // text message
  // clean up:
  if (event.title) {
    // (at least) WhatsApp includes the total number of messages in group names, which makes for very long titles
    // so shorten e.g. "Sample Group (3 messages): Kim" to "Sample Group (3): Kim"
    [/*LANG*/"message", /*LANG*/"messages"].forEach(t => event.title = event.title.replace(" "+t+")", ")"));
  }
  if (inApp) {
    // we're in an app that has already loaded messages
    // modify/delete as appropriate
    let mIdx = MESSAGES.findIndex(m => m.id===event.id);
    if (event.t==="remove") {
      if (mIdx>=0) MESSAGES.splice(mIdx, 1); // remove item
      mIdx = -1;
    } else { // add/modify
      if (mIdx<0) {
        mIdx = 0;
        MESSAGES.unshift(event); // add new messages to the beginning
      } else {
        Object.assign(MESSAGES[mIdx], event);
      }
    }
    // process immediately (saving MESSAGES is app responsibility)
    return onMessageModified(mIdx);
  }
  // not in app: append to stored list of messages
  if (event.t==="remove") {
    // if we removed the last message, hide the widget
    const status = exports.status();
    if (global.WIDGETS && WIDGETS.message
      && status!=="new"
      && (status==="none" || !(require("Storage").readJSON("messages.settings.json", true) || {}).showRead)) {
      WIDGETS.messages.hide();
    }
  }
  if ((event.t==="remove" || event.t==="modify") && Math.random()>=0.8) {
    // perform housekeeping every so often
    exports.save(exports.load());
  }
  // ok, saved now - we only care if it's new
  if (event.t!=="add" || !event.new) {
    append(event);
    return;
  }
  // otherwise load messages/show widget
  if (Bangle.CLOCK || event.important) {
    exports.loadMessages = true;
    event.load = true;
  }
  append(event);
  // first, buzz
  const quiet = (require("Storage").readJSON("setting.json", 1) || {}).quiet;
  if (!quiet && exports.loadMessages && global.WIDGETS && WIDGETS.messages) {
    WIDGETS.messages.buzz();
  }
  // after a delay load the app, to ensure we have all the messages
  if (exports.loadTimeout) clearTimeout(exports.loadTimeout);
  exports.messageTimeout = setTimeout(function() {
    exports.messageTimeout = undefined;
    // if we're in a clock or it's important, go straight to messages app
    if (exports.loadMessages) return load("messages.app.js");
    if (!quiet && (!global.WIDGETS || !WIDGETS.messages)) return Bangle.buzz(); // no widgets - just buzz to let someone know
    WIDGETS.messages.show();
  }, 500);
};
/// Remove all messages
exports.clearAll = function() {
  const inApp = "undefined"!= typeof MESSAGES;
  if (inApp) MESSAGES = []; // we're in an app that has already loaded messages
  // Erase messages file
  exports.save([]);
  // if we have a widget, update it
  if (global.WIDGETS && WIDGETS.messages) WIDGETS.messages.hide();
  // update app if in app
  if (inApp && ["messages", "menu"].includes(active)) showMenu();
};
