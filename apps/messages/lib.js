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
    if (["call", "map"].includes(e.id) && action!=="remove") {
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
    let messages;
    if ("undefined"!== typeof MESSAGES) messages = MESSAGES;
    else messages = exports.load();
    messages = messages.filter(m => !["music", "map", "call", "alarm"].includes(m.id));
    if (!messages.length) return "none";
    return messages.some(m => m.new) ? "new" : "old";
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
  if (exports.debug===undefined) {
    exports.debug = !!((require("Storage").readJSON("messages.settings.json", true) || {}).debugLog);
  }
  if (exports.debug) {
    require("Storage").open("messages.debug", "a")
      .write(`${(new Date).toJSON().slice(0, -5)} ${JSON.stringify(event)}`+"\n");
  }

  if (event.t==="add" && event.new===undefined) event.new = true; // Assume it should be new
  if (event.t==="remove" && event.id===undefined) return; // we can't handle this

  // lump these all together:
  if (event.src==="Maps") event.id = "map";

  let type = "text";
  // special messages
  if (["call", "music", "map"].includes(event.id)) type = event.id;
  if (event.src && event.src.toLowerCase().startsWith("alarm")) type = "alarm";
  if (type!=="text") {
    // mark special messages as new
    if (event.t==="modify") event.new = true;
  } else if (event.title) {
    // clean up text messages:
    // (at least) WhatsApp includes the total number of messages in group names, which makes for very long titles
    // so shorten e.g. "Sample Group (3 messages): Kim" to "Sample Group (3): Kim"
    [/*LANG*/"message", /*LANG*/"messages"].forEach(t => event.title = event.title.replace(" "+t+")", ")"));
  }
  append(event);
  Bangle.emit("message", type, event);
};
/// Remove all messages
exports.clearAll = function() {
  // Erase messages file
  exports.save([]);
  Bangle.emit("message", "eraseAll");
};
