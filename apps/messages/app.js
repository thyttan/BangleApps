/* MESSAGES is a list of:
  {id:int,
    src,
    title,
    subject,
    body,
    sender,
    tel:string,
    new:true // not read yet
  }
*/

/* For example for maps:

// a message
{"t":"add","id":1575479849,"src":"Hangouts","title":"A Name","body":"message contents"}
// maps
{"t":"add","id":1,"src":"Maps","title":"0 yd - High St","body":"Campton - 11:48 ETA","img":"GhqBAAAMAAAHgAAD8AAB/gAA/8AAf/gAP/8AH//gD/98B//Pg/4B8f8Afv+PP//n3/f5//j+f/wfn/4D5/8Aef+AD//AAf/gAD/wAAf4AAD8AAAeAAADAAA="}
// call
{"t":"add","id":"call","src":"Phone","name":"Bob","number":"12421312",positive:true,negative:true}
*/

const B2 = process.env.HWVERSION>1;
const Layout = require("Layout");
let settings = require("Storage").readJSON("messages.settings.json", true) || {};
const fontSmall = "6x8";
const fontMedium = g.getFonts().includes("6x15") ? "6x15" : "6x8:2";
const fontBig = g.getFonts().includes("12x20") ? "12x20" : "6x8:2";
const fontHuge = g.getFonts().includes("6x15") ? "6x15:2" : "6x8:4";
let active, back; // active screen, last active screen

/** this is a timeout if the app has started and is showing a single message
 but the user hasn't seen it (eg no user input) - in which case
 we should start a timeout for settings.unreadTimeout to return
 to the clock. */
let unreadTimeout;
/// List of all our messages
let MESSAGES;
try {
  MESSAGES = require("messages").load();
  // Write them back to storage when we're done
  E.on("kill", () => {
    if (map) MESSAGES.push(map); // we assume other special messages are outdated once we close the app
    require("messages").save(MESSAGES);
    delete global.MESSAGES;
  });
} catch(e) {
  g.clear();
  E.showPrompt(/*LANG*/"Message file corrupt, erase all messages?", {title:/*LANG*/"Delete All Messages"}).then(isYes => {
    if (isYes) {    // OK: erase message file and reload this app
      require("messages").save([]);
      load("messages.app.js");
    } else {
      load();// well, this app won't work... let's go back to the clock
    }
  });
}
function buzz(alarm) {
  const quiet = (require("Storage").readJSON("setting.json", 1) || {}).quiet;
  if (quiet && (!alarm || quiet<2)) return;
  if (WIDGETS["messages"]) WIDGETS["messages"].buzz();
  else Bangle.buzz();
}
// used by lib.js to inform app of updates
if (Bangle.messageListener) Bangle.removeListener("message", Bangle.messageListener); // remove listener from boot.js
Bangle.messageListener = function(type, msg) {
  switch(type) {
    case "call":
      return onCall(msg);
    case "music":
      return onMusic(msg);
    case "map":
      return onMap(msg);
    case "alarm": // TODO: implement onAlarm, for now just fall through
    case "text":
      return onText(msg);
    case "eraseAll":
      MESSAGES = [];
      if (["messages", "menu"].includes(active)) showMenu();
      break;
    default:
      E.showAlert(/*LANG*/"Unknown message type:"+"\n"+type).then(goBack);
  }
};
function onCall(msg) {
  if (msg.t==="remove") {
    call = undefined;
    if (active==="call") goBack();
  } else {
    // incoming call: show it
    call = msg;
    showCall();
  }
}
let musicTimeout;
function onMusic(msg) {
  const hadMusic = !!music;
  // music is never removed: only added/updated
  music = Object.assign({}, music, msg);

  // auto-close after being paused (because "stop" messages don't seem to exist)
  if (musicTimeout) clearTimeout(musicTimeout);
  musicTimeout = undefined;
  if (music.state!=="play") musicTimeout = setTimeout(function() {
    musicTimeout = undefined;
    if (active==="music" && music.state!=="play") goBack();
  }, Math.max(music.dur, 60)*1000); // wait song duration, or at least one minute

  if (active==="music") showMusic(); // update music screen
  else if (active==="main" && !hadMusic) {
    if (settings.openMusic && music.state==="play" && music.track) showMusic();
    else showMain(); // refresh menu: add "Music" entry
  }
}
function onMap(msg) {
  const hadMap = !!map;
  if (msg.t==="remove") {
    map = undefined;
    if (active==="map") showMain(); // map is gone
    else if (active==="main" && hadMap) showMain(); // refresh menu: remove "Map" entry
  } else {
    map = msg;
    if (["map", "music"].includes(active)) showMap(); // update map screen, or switch away from music (not other screens)
    else if (active==="main" && !hadMap) showMain(); // refresh menu: add "Map" entry
  }
}
function onText(msg) {
  let mIdx = MESSAGES.findIndex(m => m.id===msg.id);
  if (msg.t==="remove") {
    if (mIdx>=0) MESSAGES.splice(mIdx, 1); // remove item
    mIdx = -1;
  } else { // add/modify
    if (mIdx<0) {
      mIdx = 0;
      MESSAGES.unshift(msg); // add new messages to the beginning
    } else {
      Object.assign(MESSAGES[mIdx], msg);
    }
  }
  onMessageModified(mIdx);
}
Bangle.on("message", Bangle.messageListener);
// end of functions used by lib.js

function onMessageRemoved() {
  if (active==="main") return showMain(); // update message count
  if (active==="messages") {
    if (MESSAGES.length===0) { // removed last message
      if (unreadTimeout) load();
      else return showMain();
    }
    showMessage(messageNum);
  }
}
function onMessageModified(idx) {
  if (!MESSAGES[idx]) return onMessageRemoved();
  const msg = MESSAGES[idx];
  delete msg._h; // might no longer be valid
  if (msg.new) buzz();
  if (active==="call") return; // don't switch away from incoming call
  if (msg.new || active!=="messages" || messageNum===idx) showMessage(idx);
}

function getIcon(icon, def) {
  // TODO: icons should be 24x24px with 1bpp colors and transparency
  switch(icon.toLowerCase()) {
    // generic icons:
    case "alarm":
    case "alarmclockreceiver":
      return atob("GBjBAP////8AAAAAAAACAEAHAOAefng5/5wTgcgHAOAOGHAMGDAYGBgYGBgYGBgYGBgYDhgYBxgMATAOAHAHAOADgcAB/4AAfgAAAAAAAAA=");
    case "back":
      return atob("FhYBAAAAEAAAwAAHAAA//wH//wf//g///BwB+DAB4EAHwAAPAAA8AADwAAPAAB4AAHgAB+AH/wA/+AD/wAH8AA==");
    case "calendar":
      return atob("GBiBAAAAAAAAAAAAAA//8B//+BgAGBgAGBgAGB//+B//+B//+B9m2B//+B//+Btm2B//+B//+Btm+B//+B//+A//8AAAAAAAAAAAAA==");
    case "mail":
    case "sms message":
    case "notification":
      return atob("HBKBAD///8H///iP//8cf//j4//8f5//j/x/8//j/H//H4//4PB//EYj/44HH/Hw+P4//8fH//44///xH///g////A==");
    case "map":
      return atob("GRmBAAAAAAAAAAAAAAIAYAHx/wH//+D/+fhz75w/P/4f//8P//uH///D///h3f/w4P+4eO/8PHZ+HJ/nDu//g///wH+HwAYAIAAAAAAAAAAAAAA=");
    case "menu":
      return atob("GBiBAAAAAAAAAAAAAAAAAP///////wAAAAAAAAAAAAAAAAAAAP///////wAAAAAAAAAAAAAAAAAAAP///////wAAAAAAAAAAAAAAAA==");
    case "music":
      return atob("FhaBAH//+/////////////h/+AH/4Af/gB/+H3/7/f/v9/+/3/7+f/vB/w8H+Dwf4PD/x/////////////3//+A=");
    case "nak":
      return atob("FhmBAA//wH//j//+P//8///7///v//+///7//////////////v//////////z//+D8AAPwAAfgAB+AAD4AAPgAAeAAB4AAHAAA==");
    case "neg":
      return atob("FhaBADAAMeAB78AP/4B/fwP4/h/B/P4D//AH/4AP/AAf4AB/gAP/AB/+AP/8B/P4P4fx/A/v4B//AD94AHjAAMA=");
    case "nophone":
      return atob("Hh6BAAAAAAGAAAAHAAAADgAAABwADwA4Af8AcA/8AOB/+AHH/+ADv/8AB//wAA/HAAAeAAACOAAADHAAAHjgAAPhwAAfg4AAfgcAAfwOAA/wHAA/wDgA/gBwA/gA4AfAAcAfAAOAGAAHAAAADgAAABgAAAAA");
    case "ok":
      return atob("FhmBAAHAAAeAAB4AAPgAA+AAH4AAfgAD8AAPwAD//+//////////////7//////////////v//+///7///v//8///gf/+A//wA==");
    case "pause":
      return atob("GBiBAAAAAAAAAAAAAAOBwAfD4AfD4AfD4AfD4AfD4AfD4AfD4AfD4AfD4AfD4AfD4AfD4AfD4AfD4AfD4AfD4AOBwAAAAAAAAAAAAA==");
    case "phone":
      return atob("FxeBABgAAPgAAfAAB/AAD+AAH+AAP8AAP4AAfgAA/AAA+AAA+AAA+AAB+AAB+AAB+OAB//AB//gB//gA//AA/8AAf4AAPAA=");
    case "pos":
      return atob("GRSBAAAAAYAAAcAAAeAAAfAAAfAAAfAAAfAAAfAAAfBgAfA4AfAeAfAPgfAD4fAA+fAAP/AAD/AAA/AAAPAAADAAAA==");
    case "settings":
      return atob("FBSBAAAAAA8AAPABzzgf/4H/+A//APnwfw/n4H5+B+fw/g+fAP/wH/+B//gc84APAADwAAAA");
    case "to do":
      return atob("GBgBAAAAAAAAAAAwAAB4AAD8AAH+AAP/DAf/Hg//Px/+f7/8///4///wf//gP//AH/+AD/8AB/4AA/wAAfgAAPAAAGAAAAAAAAAA");
    case "trash":
      return atob("GBiBAAAAAAAAAAB+AA//8A//8AYAYAYAYAZmYAZmYAZmYAZmYAZmYAZmYAZmYAZmYAZmYAZmYAZmYAYAYAYAYAf/4AP/wAAAAAAAAA==");
    case "unknown":
      return atob("Hh6BAAAAAAAAAAAAAAAAAAPwAAA/8AAB/+AAD//AAD4fAAHwPgAHwPgAAAPgAAAfAAAA/AAAD+AAAH8AAAHwAAAPgAAAPgAAAPgAAAAAAAAAAAAAAAAAAHAAAAPgAAAPgAAAPgAAAHAAAAAAAAAAAAAAAAAA");
    case "unread":
      return atob("HRiBAAAAH4AAAf4AAB/4AAHz4AAfn4AA/Pz/5+fj/z8/j/n5/j/P//j/Pn3j+PPPx+P8fx+Pw/x+AF/B4A78RiP3xwOPvHw+Pcf/+Ox//+NH//+If//+B///+A==");
    // application icons
    case "bibel":
      return atob("GBgBAAAAA//wD//4D//4H//4H/f4H/f4H+P4H4D4H4D4H/f4H/f4H/f4H/f4H/f4H//4H//4H//4GAAAEAAAEAAACAAAB//4AAAA");
    case "corona-warn":
      return atob("GBgBAAAAABwAAP+AAf/gA//wB/PwD/PgDzvAHzuAP8EAP8AAPAAAPMAAP8AAH8AAHzsADzuAB/PAB/PgA//wAP/gAH+AAAwAAAAA");
    case "discord":
      return atob("GBgBAAAAAAAAAAAAAIEABwDgDP8wH//4H//4P//8P//8P//8Pjx8fhh+fzz+f//+f//+e//ePH48HwD4AgBAAAAAAAAAAAAAAAAA");
    case "fb":
    case "facebook":
    case "messenger":
      return atob("GBiBAAAAAAAAAAAYAAD/AAP/wAf/4A/48A/g8B/g+B/j+B/n+D/n/D8A/B8A+B+B+B/n+A/n8A/n8Afn4APnwADnAAAAAAAAAAAAAA==");
    case "gmail":
      return getIcon("mail");
    case "google home":
      return atob("GBiCAAAAAAAAAAAAAAAAAAAAAoAAAAAACqAAAAAAKqwAAAAAqroAAAACquqAAAAKq+qgAAAqr/qoAACqv/6qAAKq//+qgA6r///qsAqr///6sAqv///6sAqv///6sAqv///6sA6v///6sA6v///qsA6qqqqqsA6qqqqqsA6qqqqqsAP7///vwAAAAAAAAAAAAAAAAA==");
    case "hangouts":
      return atob("FBaBAAH4AH/gD/8B//g//8P//H5n58Y+fGPnxj5+d+fmfj//4//8H//B//gH/4A/8AA+AAHAABgAAAA=");
    case "home assistant":
      return atob("FhaBAAAAAADAAAeAAD8AAf4AD/3AfP8D7fwft/D/P8ec572zbzbNsOEhw+AfD8D8P4fw/z/D/P8P8/w/z/AAAAA=");
    case "instagram":
      return atob("GBiBAAAAAAAAAAAAAAAAAAP/wAYAYAwAMAgAkAh+EAjDEAiBEAiBEAiBEAiBEAjDEAh+EAgAEAwAMAYAYAP/wAAAAAAAAAAAAAAAAA==");
    case "kalender":
      return atob("GBgBBgBgBQCgff++RQCiRgBiQAACf//+QAACQAACR//iRJkiRIEiR//iRNsiRIEiRJkiR//iRIEiRIEiR//iQAACQAACf//+AAAA");
    case "lieferando":
      return atob("GBgBABgAAH5wAP9wAf/4A//4B//4D//4H//4P/88fV8+fV4//V4//Vw/HVw4HVw4HBg4HBg4HBg4HDg4Hjw4Hj84Hj44Hj44Hj44");
    case "nina":
      return atob("GBgBAAAABAAQCAAICAAIEAAEEgAkJAgSJBwSKRxKSj4pUn8lVP+VVP+VUgAlSgApKQBKJAASJAASEgAkEAAECAAICAAIBAAQAAAA");
    case "outlook mail":
      return atob("HBwBAAAAAAAAAAAIAAAfwAAP/gAB/+AAP/5/A//v/D/+/8P/7/g+Pv8Dye/gPd74w5znHDnOB8Oc4Pw8nv/Dwe/8Pj7/w//v/D/+/8P/7/gf/gAA/+AAAfwAAACAAAAAAAAAAAA=");
    case "post & dhl":
      return atob("GBgBAPgAE/5wMwZ8NgN8NgP4NgP4HgP4HgPwDwfgD//AB/+AAf8AAAAABs7AHcdgG4MwAAAAGESAFESAEkSAEnyAEkSAFESAGETw");
    case "signal":
      return atob("GBgBAAAAAGwAAQGAAhggCP8QE//AB//oJ//kL//wD//0D//wT//wD//wL//0J//kB//oA//ICf8ABfxgBYBAADoABMAABAAAAAAA");
    case "skype":
      return atob("GhoBB8AAB//AA//+Af//wH//+D///w/8D+P8Afz/DD8/j4/H4fP5/A/+f4B/n/gP5//B+fj8fj4/H8+DB/PwA/x/A/8P///B///gP//4B//8AD/+AAA+AA==");
    case "slack":
      return atob("GBiBAAAAAAAAAABAAAHvAAHvAADvAAAPAB/PMB/veD/veB/mcAAAABzH8B3v+B3v+B3n8AHgAAHuAAHvAAHvAADGAAAAAAAAAAAAAA==");
    case "snapchat":
      return atob("GBgBAAAAAAAAAH4AAf+AAf+AA//AA//AA//AA//AA//AH//4D//wB//gA//AB//gD//wH//4f//+P//8D//wAf+AAH4AAAAAAAAA");
    case "teams":
      return atob("GBgBAAAAAAAAAAQAAB4AAD8IAA8cP/M+f/scf/gIeDgAfvvefvvffvvffvvffvvff/vff/veP/PeAA/cAH/AAD+AAD8AAAQAAAAA");
    case "telegram":
      return atob("GBiBAAAAAAAAAAAAAAAAAwAAHwAA/wAD/wAf3gD/Pgf+fh/4/v/z/P/H/D8P/Acf/AM//AF/+AF/+AH/+ADz+ADh+ADAcAAAMAAAAA==");
    case "threema":
      return atob("GBjB/4Yx//8AAAAAAAAAAAAAfgAB/4AD/8AH/+AH/+AP//AP2/APw/APw/AHw+AH/+AH/8AH/4AH/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    case "twitch":
      return atob("GBgBH//+P//+P//+eAAGeAAGeAAGeDGGeDOGeDOGeDOGeDOGeDOGeDOGeAAOeAAOeAAcf4/4f5/wf7/gf//Af/+AA/AAA+AAAcAA");
    case "twitter":
      return atob("GhYBAABgAAB+JgA/8cAf/ngH/5+B/8P8f+D///h///4f//+D///g///wD//8B//+AP//gD//wAP/8AB/+AB/+AH//AAf/AAAYAAA");
    case "whatsapp":
      return atob("GBiBAAB+AAP/wAf/4A//8B//+D///H9//n5//nw//vw///x///5///4///8e//+EP3/APn/wPn/+/j///H//+H//8H//4H//wMB+AA==");
    case "wordfeud":
      return atob("GBgCWqqqqqqlf//////9v//////+v/////++v/////++v8///Lu+v8///L++v8///P/+v8v//P/+v9v//P/+v+fx/P/+v+Pk+P/+v/PN+f/+v/POuv/+v/Ofdv/+v/NvM//+v/I/Y//+v/k/k//+v/i/w//+v/7/6//+v//////+v//////+f//////9Wqqqqqql");
    case "youtube":
      return atob("GBgBAAAAAAAAAAAAAAAAAf8AH//4P//4P//8P//8P5/8P4/8f4P8f4P8P4/8P5/8P//8P//8P//4H//4Af8AAAAAAAAAAAAAAAAA");
    default:
      return getIcon(def || "unknown");
  }
}
/*
* icons should be 24x24px with 1bpp colors and transparancy
*/
function getMessageImage(msg) {
  if (msg.img) return atob(msg.img);
  if (msg.id==="music") return getIcon("Music");
  if (msg.id==="back") return getIcon("Back");
  const s = (msg.src || "").toLowerCase();

  return getIcon(s) || getIcon("notification");
}
function getMessageImageCol(msg, def) {
  return {
    // generic colors, using B2-safe colors
    "alarm": "#fff",
    "calendar": "#f00",
    "mail": "#ff0",
    "music": "#f0f",
    "phone": "#0f0",
    "sms message": "#0ff",
    // brands, according to https://www.schemecolor.com/?s (picking one for multicolored logos)
    // all dithered on B2, but we only use the color for the icons.  (Could maybe pick the closest 3-bit color for B2?)
    "bibel": "#54342c",
    "discord": "#738adb",
    "facebook": "#4267b2",
    "gmail": "#ea4335",
    "google home": "#fbbc05",
    "hangouts": "#1ba261",
    "home assistant": "#fff", // ha-blue is #41bdf5, but that's the background
    "instagram": "#dd2a7b",
    "liferando": "#ee5c00",
    "messenger": "#0078ff",
    "nina": "#e57004",
    "outlook mail": "#0072c6",
    "post & dhl": "#f2c101",
    "signal": "#00f",
    "skype": "#00aff0",
    "slack": "#e51670",
    "snapchat": "#ff0",
    "teams": "#464eb8",
    "telegram": "#0088cc",
    "threema": "#000",
    "to do": "#3999e5",
    "twitch": "#6441A4",
    "twitter": "#1da1f2",
    "whatsapp": "#4fce5d",
    "wordfeud": "#e7d3c7",
    "youtube": "#f00",
  }[(msg.src || "").toLowerCase()] || (def!==undefined ? def : g.theme.fg);
}

function showMap() {
  setActive("map");
  clearStuff();
  delete map.new;
  let m, distance, street, target, eta;
  m = map.title.match(/(.*) - (.*)/);
  if (m) {
    distance = m[1];
    street = m[2];
  } else {
    street = map.title;
  }
  m = map.body.match(/(.*) - (.*)/);
  if (m) {
    target = m[1];
    eta = m[2];
  } else {
    target = map.body;
  }
  let layout = new Layout({
    type: "v", c: [
      {type: "txt", font: fontMedium, label: target, bgCol: g.theme.bg2, col: g.theme.fg2, fillx: 1, pad: 2},
      {
        type: "h", bgCol: g.theme.bg2, col: g.theme.fg2, fillx: 1, c: [
          {type: "txt", font: "6x8", label: "Towards"},
          {type: "txt", font: fontHuge, label: street}
        ]
      },
      {
        type: "h", fillx: 1, filly: 1, c: [
          map.img ? {type: "img", src: atob(map.img), scale: 2} : {},
          {
            type: "v", fillx: 1, c: [
              {type: "txt", font: fontHuge, label: distance || ""}
            ]
          },
        ]
      },
      {type: "txt", font: "6x8:2", label: eta}
    ]
  });
  layout.render();
  // go back on any input
  Bangle.setUI({
    mode: "custom",
    back: goBack,
    btn: goBack,
    swipe: goBack,
  });
}

let updateLabelsInterval;
function toggleMusic() {
  const mc = cmd => {
    if (Bangle.musicControl) Bangle.musicControl(cmd);
  };
  if (!music) {
    music = {state: "play"};
    mc("play");
  } else if (music.state==="play") {
    music.state = "pause";
    mc("pause");
  } else {
    music.state = "play";
    mc("play");
  }
}
function showMusic() {
  setActive("music");
  clearStuff();
  let trackScrollOffset = 0;
  let artistScrollOffset = 0;
  let albumScrollOffset = 0;
  let trackName = "";
  let artistName = "";
  let albumName = "";

  function fmtTime(s) {
    const m = Math.floor(s/60);
    s = (s%60).toString().padStart(2, "0");
    return m+":"+s;
  }
  function reduceStringAndPad(text, offset, maxLen) {
    if (text.length<=maxLen) return text;
    const sliceLength = offset+maxLen>text.length ? text.length-offset : maxLen;
    return text.substring(offset, offset+sliceLength).padEnd(maxLen, " ");
  }

  function updateLabels() {
    trackName = reduceStringAndPad(music.track, trackScrollOffset, 13);
    artistName = reduceStringAndPad(music.artist, artistScrollOffset, 21);
    albumName = reduceStringAndPad(music.album, albumScrollOffset, 21);

    trackScrollOffset++;
    artistScrollOffset++;
    albumScrollOffset++;

    if ((trackScrollOffset+13)>music.track.length) trackScrollOffset = 0;
    if ((artistScrollOffset+21)>music.artist.length) artistScrollOffset = 0;
    if ((albumScrollOffset+21)>music.album.length) albumScrollOffset = 0;
  }
  updateLabels();

  const icon = (music.state==="play") ? "music" : "pause";
  layout = new Layout({
    type: "v", c: [
      {
        type: "h", fillx: 1, bgCol: g.theme.bg2, col: g.theme.fg2, c: [
          {type: "img", id: "music", pad: 10, bgCol: g.theme.bg2, col: g.theme.fg2, src: getIcon(icon)},
          {
            type: "v", fillx: 1, c: [
              {type: "txt", font: fontMedium, col: g.theme.fg2, bgCol: g.theme.bg2, label: artistName, pad: 2, id: "artist"},
              {type: "txt", font: fontMedium, col: g.theme.fg2, bgCol: g.theme.bg2, label: albumName, pad: 2, id: "album"}
            ]
          }
        ]
      },
      {type: "txt", halign: 0, font: fontHuge, bgCol: g.theme.bg, label: trackName, fillx: 1, filly: 1, pad: 2, id: "track"},
      music.dur ? {type: "txt", font: fontMedium, bgCol: g.theme.bg, label: fmtTime(music.dur)} : {}
    ]
  });
  layout.render();
  Bangle.setUI({
    mode: "updown",
    back: () => goBack(),
  }, ud => {
    if (!Bangle.musicControl) return;
    if (ud) Bangle.musicControl(ud>0 ? "volumedown" : "volumeup");
    else {
      toggleMusic();
      const icon = (music.state==="play") ? "music" : "pause";
      layout.music.src = getIcon(icon);
      layout.render(layout.music);
    }
  });
  Bangle.swipeHandler = dir => {
    if (dir===1) goBack();
    if (dir=== -1 && Bangle.musicControl) {
      Bangle.buzz(20);
      Bangle.musicControl("next");
    }
  };
  Bangle.on("swipe", Bangle.swipeHandler);

  updateLabelsInterval = setInterval(function() {
    updateLabels();
    layout.artist.label = artistName;
    layout.album.label = albumName;
    layout.track.label = trackName;
    layout.render();
  }, 400);
}

let layout;
function clearUnreadTimeout() {
  if (unreadTimeout) clearTimeout(unreadTimeout);
  ["touch", "drag", "swipe"].forEach(l => Bangle.removeListener(l, clearUnreadTimeout));
  unreadTimeout = undefined;
}
function clearStuff() {
  delete Bangle.appRect;
  layout = undefined;
  Bangle.setUI();
  if (updateLabelsInterval) clearInterval(updateLabelsInterval);
  updateLabelsInterval = undefined;
  g.clearRect(Bangle.appRect);
}
function setActive(screen, args) {
  clearStuff();
  if (active && screen!==active) back = active;
  if (screen==="messages") messageNum = args;
  active = screen;
}
function goBack() {
  if (back==="call" && call) showCall();
  else if (back==="map" && map) showMap();
  else if (back==="music" && music) showMusic();
  else if (back==="messages" && MESSAGES.length) showMessage();
  else if (back) showMain(); // previous screen was "main", or no longer valid
  else load(); // no previous screen: go back to clock
}
function showMain() {
  setActive("main");
  let grid = {"": {title:/*LANG*/"Messages", align: 0}};
  if (call) grid[/*LANG*/"Incoming Call"] = {icon: "Phone", col: "#0f0", cb: () => showCall()};
  const unread = MESSAGES.filter(m => m.new).length;
  if (unread) {
    grid[unread+" "+/*LANG*/"New"] = {icon: "Unread", col: "#ff0", cb: () => showMessage(MESSAGES.findIndex(m => m.new))};
    grid[/*LANG*/"All"+` (${MESSAGES.length})`] = {icon: "Notification", col: "#0ff", cb: () => showMessage()};
  } else {
    const allLabel = MESSAGES.length+" "+(MESSAGES.length===1 ?/*LANG*/"Message" :/*LANG*/"Messages");
    if (MESSAGES.length) grid[allLabel] = {icon: "Notification", col: "#0ff", cb: () => showMessage()};
    else grid[/*LANG*/"No Messages"] = {icon: "Neg", col: "#fff", cb: () => load()};
  }
  if (unread<MESSAGES.length) {
    grid[/*LANG*/"Dismiss Read"] = {
      icon: "Trash", col: "#f00", cb: () => {
        E.showPrompt(/*LANG*/"Are you sure?", {title:/*LANG*/"Dismiss Read Messages"}).then(isYes => {
          if (isYes) {
            MESSAGES.filter(m => !m.new).forEach(m => Bangle.messageResponse(m, false));
            MESSAGES = MESSAGES.filter(m => m.new);
          }
          showMain();
        });
      }
    };
  }
  if (map) grid[/*LANG*/"Map"] = {icon: "Map", col: "#f0f", cb: () => showMap()};
  if (music) grid[/*LANG*/"Music"] = {icon: "Music", col: "#f00", cb: () => showMusic()};
  grid[/*LANG*/"Settings"] = {icon: "Settings", col: "#000", cb: () => showSettings()};
  if (B2) showGrid(grid);
  else showGridMenu(grid);
}
/**
 * Show grid items as menu
 * @param items
 */
function showGridMenu(items) {
  let menu = {};
  for(let key in items) {
    menu[key] = items[key].cb;
  }
  return E.showMenu(menu);
}
/**
 * Show grid of labeled buttons,
 *
 * items:
 *   {
 *     cb: callback,
 *     img: button image,
 *     icon: icon name, // instead of img
 *     col: icon color,
 *   }
 * "" item is options:
 *   {
 *     title: string,
 *     back: callback,
 *     rows/cols: (optional) fit to this many columns/rows, omit for automatic fit
 *     align: bottom row alignment if items don't fit perfectly into a grid
 *            -1: left
 *             1: right
 *             0: left, but move final button to the right
 *             undefined: center (i.e. unaligned with rest of grid)
 *   }
 * @param items
 */
function showGrid(items) {
  clearStuff();
  const options = items[""] || {},
    back = options.back || items["< Back"];
  let keys;
  if (B2) {
    keys = Object.keys(items).filter(k => k!=="" && k!=="< Back");
  } else {
    keys = Object.keys(items).filter(k => k!=="");
    if (back && !keys.includes("< Back")) {
      items["< Back"] = back;
      keys.unshift("< Back");
    }
  }
  let cols;
  if (options.cols) {
    cols = options.cols;
  } else if (options.rows) {
    cols = Math.ceil(keys.length/options.rows);
  } else {
    const rows = Math.round(Math.sqrt(keys.length));
    cols = Math.ceil(keys.length/rows);
  }

  let l = {type: "v", c: []};
  if (options.title) {
    const title = g.setFont(fontBig).wrapString(options.title, Bangle.appRect.w).join("\n");
    l.c.push({type: "txt", label: title, font: fontBig, fillx: 1});
  }
  const w = Bangle.appRect.w/cols, // set explicit width, because labels can stick out
    bgs = [g.theme.bgH, g.theme.bg2], // background colors used for buttons
    newRow = () => ({type: "h", filly: 1, c: []});
  let row = newRow();
  keys.forEach(key => {
    const item = items[key],
      label = g.setFont(fontSmall).wrapString(key, w).join("\n");
    let color = item.col;
    if (color && bgs.includes(g.setColor(color).getColor())) color = undefined; // make sure button is not invisible
    row.c.push({
      type: "v", pad: 2, width: w, c: [
        {
          type: "btn",
          src: item.img || getIcon(item.icon) || getIcon("Unknown"),
          col: color,
          cb: item.cb,
        },
        {height: 2},
        {type: "txt", label: label, font: fontSmall},
      ]
    });
    if (row.c.length>=cols) {
      l.c.push(row);
      row = newRow();
    }
  });
  if (row.c.length) {
    const filler = {width: w*(cols-row.c.length)};
    if (options.align===1) row.c.push(filler);
    if (options.align===0) row.c.splice(row.c.length-1, 0, filler);
    if (options.align=== -1) row.c.unshift(filler);
    l.c.push(row);
  }

  layout = new Layout(l, {back: back});
  layout.render();
}

function showSettings() {
  setActive("settings");
  eval(require("Storage").read("messages.settings.js"))(() => {
    settings = require("Storage").readJSON("messages.settings.json", true) || {};
    MESSAGES.forEach(m => delete m.h); // in case font size changed
    showMain();
  });
}
function showCall() {
  setActive("call");
  clearStuff();
  delete call.new;
  // Normal text message display
  let title = call.title, titleFont = fontHuge, lines, w;
  w = g.getWidth()-48;
  if (g.setFont(titleFont).stringWidth(title)>w) {
    titleFont = fontBig;
    if (settings.fontSize!==1 && g.setFont(titleFont).stringWidth(title)>w) {
      titleFont = fontMedium;
    }
  }
  if (g.setFont(titleFont).stringWidth(title)>w) {
    lines = g.wrapString(title, w);
    title = (lines.length>2) ? lines.slice(0, 2).join("\n")+"..." : lines.join("\n");
  }
  // If body of message is only two lines long w/ large font, use large font.
  let body = call.body, bodyFont = fontHuge;
  w = g.getWidth()-10;
  if (g.setFont(bodyFont).stringWidth(body)>w*2) {
    bodyFont = fontBig;
    if (settings.fontSize!==1 && g.setFont(bodyFont).stringWidth(body)>w*3) {
      bodyFont = fontMedium;
    }
  }
  if (g.setFont(bodyFont).stringWidth(body)>w) {
    lines = g.setFont(bodyFont).wrapString(call.body, w);
    const maxLines = Math.floor((g.getHeight()-110)/g.getFontHeight());
    body = (lines.length>maxLines) ? lines.slice(0, maxLines).join("\n")+"..." : lines.join("\n");
  }
  function respond(accept) {
    Bangle.buzz(20);
    Bangle.messageResponse(call, accept);
    call = undefined;
    goBack();
  }
  let options = {};
  if (!B2) {
    options.btns = [
      {
        label:/*LANG*/"accept",
        cb: () => respond(true),
      }, {
        label:/*LANG*/"ignore",
        cb: () => goBack(),
      }, {
        label:/*LANG*/"reject",
        cb: () => respond(false),
      }
    ];
  }

  layout = new Layout({
    type: "v", c: [
      {
        type: "h", fillx: 1, bgCol: g.theme.bg2, col: g.theme.fg2, c: [
          {type: "img", pad: 10, src: getIcon("phone"), col: getMessageImageCol(call)},
          {
            type: "v", fillx: 1, c: [
              {type: "txt", font: fontSmall, label: call.src ||/*LANG*/"Message", bgCol: g.theme.bg2, col: g.theme.fg2, fillx: 1, pad: 2, halign: 1},
              title ? {type: "txt", font: titleFont, label: title, bgCol: g.theme.bg2, col: g.theme.fg2, fillx: 1, pad: 2} : {},
            ]
          },
        ]
      },
      {type: "txt", font: bodyFont, label: body, fillx: 1, filly: 1, pad: 2},
      {
        type: "h", fillx: 1, c: [
          // button callbacks won't actually be used: setUI below overrides the touchHandler set by Layout
          {type: B2 ? "btn" : "img", src: getIcon("Neg"), cb: () => respond(false)},
          {fillx: 1},
          {type: B2 ? "btn" : "img", src: getIcon("Pos"), cb: () => respond(true)},
        ]
      }
    ]
  }, options);
  layout.render();
  Bangle.setUI({
    mode: "custom",
    back: () => goBack(),
    touch: side => {
      if (side===1) respond(false);
      if (side===2) respond(true);
    },
    btn: b => {
      if (B2 || b===2) goBack();
      else if (b===1) respond(true);
      else respond(false);
    }
  });
}
/**
 * Send message response, and delete it from list
 * @param {string|boolean} reply Response text, false to dismiss (true to open on phone)
 */
function respondToMessage(reply) {
  const msg = MESSAGES[messageNum];
  if (msg) {
    Bangle.messageResponse(msg, reply);
    if (reply===false) { // delete message
      MESSAGES.splice(messageNum, 1);
    }
  }
  if (MESSAGES.length<1) goBack(); // no more messages
  else showMessage((msg && reply===false) ? messageNum : messageNum+1); // show next message
}
function showMessageActions() {
  let title = MESSAGES[messageNum].title || "";
  if (g.setFont(fontBig).stringMetrics(title).width>Bangle.appRect.w) {
    title = g.setFont(fontBig).wrapString("..."+title, Bangle.appRect.w)[0].substring(3)+"...";
  }
  clearStuff();
  let grid = {
    "": {
      title: title ||/*LANG*/"Message",
      back: () => showMessage(messageNum),
      cols: 3, // fit all replies on first row, dismiss on bottom
    }
  };
  grid[/*LANG*/"OK"] = {icon: "Ok", col: "#0f0", cb: () => respondToMessage("👍")};
  grid[/*LANG*/"Nak"] = {icon: "Nak", col: "#f00", cb: () => respondToMessage("👎")};
  grid[/*LANG*/"No Phone"] = {icon: "NoPhone", col: "#f0f", cb: () => respondToMessage("📵")};

  grid[/*LANG*/"Dismiss"] = {icon: "Trash", col: "#ff0", cb: () => respondToMessage(false)};
  if (B2) showGrid(grid);
  else showGridMenu(grid);
}
/**
 * Show message
 *
 * @param {number} [num=0] Message to show
 * @param {boolean} [bottom=false] Scroll message to bottom right away
 */
let buzzing = false, moving = false, switching = false;
function showMessage(num, bottom) {
  clearStuff();
  if (!MESSAGES.length) {
    // I /think/ this should never happen...
    return E.showPrompt(/*LANG*/"No Messages", {
      title:/*LANG*/"Messages",
      img: require("heatshrink").decompress(atob("kkk4UBrkc/4AC/tEqtACQkBqtUDg0VqAIGgoZFDYQIIM1sD1QAD4AIBhnqA4WrmAIBhc6BAWs8AIBhXOBAWz0AIC2YIC5wID1gkB1c6BAYFBEQPqBAYXBEQOqBAnDAIQaEnkAngaEEAPDFgo+IKA5iIOhCGIAFb7RqAIGgtUBA0VqobFgNVA")),
      buttons: {/*LANG*/"Ok": 1}
    }).then(() => { showMain(); });
  }
  if (num<0) num = 0;
  if (!num) num = 0; // no number: show first
  if (num>=MESSAGES.length) num = MESSAGES.length-1;
  setActive("messages", num);
  // only clear msg.new on user input
  const msg = MESSAGES[num], // message
    fh = 10; // footer height
  let offset = 0, oldOffset = 0;
  const move = (dy) => {
    offset = Math.max(0, Math.min(h-(ar.h-fh), offset+dy)); // clip at message height
    dy = oldOffset-offset; // real dy
    // move all elements to new offset
    function offsetRecurser(l) {
      if (l.y) l.y += dy;
      if (l.c) l.c.forEach(offsetRecurser);
    }
    offsetRecurser(layout.l);
    oldOffset = offset;
    draw();
  };
  const draw = () => {
    g.clearRect(ar.x, ar.y, ar.x2, ar.y2-fh)
      .setClipRect(ar.x, ar.y, ar.x2, ar.y2-fh);
    g.reset = () => { // stop Layout resetting ClipRect
      g.setColor(g.theme.fg).setBgColor(g.theme.bg);
    };
    layout.render();
    delete g.reset;
    if (h>(ar.h-fh)) {
      const sbh = (ar.h-fh)/h*(ar.h-fh), // scrollbar height
        y1 = ar.y+offset/h*(ar.h-fh), y2 = y1+sbh;
      g.setColor(g.theme.bg).drawLine(ar.x2, ar.y, ar.x2, ar.y2-fh);
      g.setColor(g.theme.fg).drawLine(ar.x2, y1, ar.x2, y2);
    }
    drawFooter();
  };
  const buzzOnce = () => {
    if (buzzing) return;
    buzzing = true;
    Bangle.buzz(50).then(() => setTimeout(() => {buzzing = false;}, 500));
  };

  /**
   * draw (sticky) footer
   */
  function drawFooter() {
    // left hint: swipe from left for main menu
    g.reset().clearRect(ar.x, ar.y2-fh, ar.x2, ar.y2)
      .setFont(fontSmall)
      .setFontAlign(-1, 1) // bottom left
      .drawString(
        "\0"+atob("CAiBACBA/EIiAnwA")+ // back
        "\0"+atob("CAiBAEgkEgkSJEgA"), // >>
        ar.x, ar.y2
      );
    // center message count+hints: swipe up/down for next/prev message
    const footer = `  ${num+1}/${MESSAGES.length}  `,
      fw = g.stringWidth(footer);
    g.setFontAlign(0, 1); // bottom center
    if (num>0 && offset<=0)
      g.drawString("\0"+atob("CAiBAABBIhRJIhQI"), ar.x+ar.w/2-fw/2, ar.y2); // ^ swipe to prev
    g.drawString(footer, ar.x+ar.w/2, ar.y2);
    if (num<MESSAGES.length-1 && offset>=h-(ar.h-fh))
      g.drawString("\0"+atob("CAiBABAoRJIoRIIA"), ar.x+ar.w/2+fw/2, ar.y2); // v swipe to next
    // right hint: swipe from right for message actions
    g.setFontAlign(1, 1) // bottom right
      .drawString(
        "\0"+atob("CAiBABIkSJBIJBIA")+ // <<
        "\0"+atob("CAiBAP8AAP8AAP8A"), // = ("hamburger menu")
        ar.x2, ar.y2
      );
  }

  layout = getMessageLayout(msg);
  const h = layout.l.h; // message height
  if (bottom) move(h); // scrolling backwards: jump to bottom of message
  else draw();
  if (B2) {
    Bangle.setUI({
      mode: "custom",
      back: () => {
        delete msg.new;
        goBack();
      },
      swipe: dir => {
        delete msg.new;
        if (dir===1) goBack();
        else if (dir=== -1) showMessageActions();
      },
      drag: e => {
        delete msg.new;
        if (!switching) {
          const dy = -e.dy;
          if (dy>0) { // up
            if (h>ar.h-fh && offset<h-(ar.h-fh)) {
              moving = true; // prevent scrolling right into next message
              move(dy);
            } else if (num<MESSAGES.length-1) { // already at bottom: show next
              if (!moving) { // don't scroll right through to next message
                Bangle.buzz(30);
                switching = true; // don't process any more drag events until we lift our finger
                showMessage(num+1);
              }
            } else { // already at bottom of last message
              buzzOnce();
            }
          } else if (dy<0) { // down
            if (offset>0) {
              moving = true; // prevent scrolling right into prev message
              move(dy);
            } else if (num>0) { // already at top: show prev
              if (!moving) { // don't scroll right through to previous message
                Bangle.buzz(30);
                switching = true; // don't process any more drag events until we lift our finger
                showMessage(num-1, true);
              }
            } else { // already at top of first message
              buzzOnce();
            }
          }
        }
        if (!e.b) {
          // touch end: we can swipe to another message (if we reached the top/bottom) or move the new message
          moving = false;
          switching = false;
        }
      },
      touch: (side, xy) => {
        delete msg.new;
        let handled = false;
        // setUI overrides Layout listeners, so we need to check for button presses ourselves
        if (layout.button) {
          const b = layout.button;
          if (xy.x>=b.x && xy.y>=b.y && xy.x<=b.x+b.w && xy.y<=b.y+b.h) return b.cb();
        }
        // touch anywhere else:
        if (!handled && xy.y>=ar.y) {
          switch(settings.onTap) {
            case 1:
              return respondToMessage(false);
            case 2:
              return goBack();
            case 0:
            default:
              return showMessageActions();
          }
        }
      },
    });
  } else { // Bangle.js 1
    Bangle.setUI({
      mode: "updown",
      back: () => {
        delete msg.new;
        goBack();
      },
    }, dir => {
      delete msg.new;
      const STEP = 50;
      if (dir=== -1) { // up
        if (h>ar.h && offset<h-ar.h) {
          move(+STEP);
        } else if (num<MESSAGES.length-1) { // bottom reached: show next
          Bangle.buzz(30);
          showMessage(num+1);
        } else {
          buzzOnce(); // already at bottom of last message
        }
      } else if (dir===1) { // down
        if (offset>0) {
          move(-STEP);
        } else if (num>0) { // top reached: show previous
          Bangle.buzz(30);
          showMessage(num-1);
        } else {
          buzzOnce(); // already at top of first message
        }
      } else {
        showMessageActions();
      }
    });
    Bangle.swipeHandler = dir => {
      delete msg.new;
      if (dir===1) goBack();
      else if (dir=== -1) showMessageActions();
    };
    Bangle.on("swipe", Bangle.swipeHandler);
    Bangle.touchHandler = side => {
      delete msg.new;
      // treat whole right-side as button
      if (layout.button && side===2) return layout.button.cb();
      // no button to touch:
      switch(settings.onTap) {
        case 1:
          return respondToMessage(false);
        case 2:
          return goBack();
        case 0:
        default:
          return showMessageActions();
      }
    };
    Bangle.on("touch", Bangle.touchHandler);
  }
}
/**
 * Determine message layout information: size, fonts, and wrapped title/body texts
 *
 * @param msg
 * @returns {{h: number, src: (string), title: (string), titleFont: (string), body: (string), bodyFont: (string)}}
 */
function getMessageLayoutInfo(msg) {

  // header: [icon][title]
  //         [ src]
  //
  // But: no title? -> use src as title
  let w, src = msg.src || "",
    title = msg.title || "", titleFont = fontHuge,
    body = msg.body || "", bodyFont = fontHuge,
    th = 0, // title height
    ih = 54; // icon height: // icon(24) + internal padding(20) + padding(10)
  if (!title) {
    title = src;
    src = "";
  }
  if (title) {
    th += 2; // padding
    w = Bangle.appRect.w-60;  // icon(24) + padding:left(5) + padding:btn-txt(5) + internal btn padding(20) + padding:right(5) + scrollbar(1)
    if (g.setFont(titleFont).stringWidth(title)>w) {
      titleFont = fontBig;
      if (settings.fontSize!==1 && g.setFont(titleFont).stringWidth(title)>w) {
        titleFont = fontMedium;
      }
    }
    title = g.setFont(titleFont).wrapString(title, w).join("\n");
    th += g.stringMetrics(title).height;
  }
  if (src) {
    w = 59;  // icon(24) + padding:left(5) + padding:btn-txt(5) + internal btn padding(20) + padding:right(5)
    src = g.setFont(fontSmall).wrapString(src, w).join("\n");
    ih += g.setFont(fontSmall).stringMetrics(src).height;
  }

  let h = Math.max(ih, th); // maximum of icon/title

  // body:
  w = Bangle.appRect.w-5; // scrollbar+padding(2x2)
  if (g.setFont(bodyFont).stringWidth(body)>w*2) {
    bodyFont = fontBig;
    if (settings.fontSize!==1 && g.setFont(bodyFont).stringWidth(body)>w*3) {
      bodyFont = fontMedium;
    }
  }
  body = g.setFont(bodyFont).wrapString(msg.body, w).join("\n");
  h += 4+g.stringMetrics(body).height;

  if (settings.button) h += 44; // icon(24) + padding(2x2) + internal btn padding(16)

  w = Bangle.appRect.w;
  if (h>Bangle.appRect.h) w--; // 1px scrollbar

  return {
    src: src,
    title: title, titleFont: titleFont,
    body: body, bodyFont: bodyFont,
    h: h,
    w: w,
  };
}

function getMessageLayout(msg) {
  const info = getMessageLayoutInfo(msg);

  // lie to Layout library about available space
  Bangle.appRect = Object.assign({}, ar, {w: info.w, h: info.h, x2: ar.x+info.w-1, y2: ar.y+info.h-1});
  layout = new Layout({
    type: "v", c: [
      {
        type: "h", fillx: 1, bgCol: g.theme.bg2, col: g.theme.fg2, c: [
          {width: 3},
          {
            type: "v", c: [
              {height: 3},
              {type: "img", pad: 2, src: getMessageImage(msg), col: getMessageImageCol(msg)},
              info.src ? {type: "txt", font: fontSmall, label: info.src, bgCol: g.theme.bg2, col: g.theme.fg2} : {},
              {height: 3},
            ]
          },
          info.title ? {type: "txt", font: info.titleFont, label: info.title, bgCol: g.theme.bg2, col: g.theme.fg2, fillx: 1, pad: 2} : {},
          {width: 3},
        ]
      },
      {type: "txt", font: info.bodyFont, label: info.body, fillx: 1, filly: 1, pad: 2},
      settings.button ? {
        type: "h", c: [
          B2 ? {} : {fillx: 1}, // Bangle.js 1: touching right side = press button
          {id: "button", type: "btn", pad: 2, src: getIcon("trash"), cb: () => respondToMessage(false)},
        ]
      } : {},
    ]
  });
  layout.update();
  delete Bangle.appRect;
  return layout;
}

let ar, call, music, map, alarm, messageNum;
if (MESSAGES!==undefined) { // only if loading MESSAGES worked
  g.clear();
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  ar = Bangle.appRect;
  // find special messages, and remove them from MESSAGES
  let idx = MESSAGES.findIndex(m => m.id==="call");
  if (idx>=0) call = MESSAGES.splice(idx, 1)[0];
  idx = MESSAGES.findIndex(m => m.id==="music");
  if (idx>=0) music = MESSAGES.splice(idx, 1)[0];
  idx = MESSAGES.findIndex(m => m.id==="map");
  if (idx>=0) map = MESSAGES.splice(idx, 1)[0];
  // any new text messages?
  const newIdx = MESSAGES.findIndex(m => m.new);

  // figure out why the app was loaded
  if (call && call.new) showCall(call);
  else if (newIdx>=0) showMessage(newIdx);
  else if (map && map.new) showMap(map);
  else if (music && settings.openMusic) showMusic(music);
  else if (MESSAGES.length) { // not autoloaded, but we have messages to show
    back = "main"; // prevent "back" from loading clock
    showMessage();
  } else showMain();
  if ((call && call.new) || newIdx>=0 || alarm) {
    buzz(!!alarm);
  }

  if (!(call && call.new) && newIdx>=0) {
    // autoloaded for message(s): autoclose unless we receive input
    let unreadTimeoutSecs = settings.unreadTimeout;
    if (unreadTimeoutSecs===undefined) unreadTimeoutSecs = 60;
    if (unreadTimeoutSecs) {
      unreadTimeout = setTimeout(() => {load();}, unreadTimeoutSecs*1000);
      ["touch", "drag", "swipe"].forEach(l => Bangle.on(l, clearUnreadTimeout));
    }
  }
}
