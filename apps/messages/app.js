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
const REPLIES = {"ok": "👍", "nak": "👎", "nophone": "📵"};
const Layout = require("Layout");
let settings = require("Storage").readJSON("messages.settings.json", true) || {};
const fontSmall = "6x8";
const fontMedium = g.getFonts().includes("6x15") ? "6x15" : "6x8:2";
const fontBig = g.getFonts().includes("12x20") ? "12x20" : "6x8:2";
const fontHuge = g.getFonts().includes("6x15") ? "6x15:2" : "6x8:4";
let active, last; // active screen, last active screen
// hack for 2v10 firmware's lack of ':size' font handling
try {
  g.setFont("6x8:2");
} catch(e) {
  g._setFont = g.setFont;
  g.setFont = function(f, s) {
    if (f.includes(":")) {
      f = f.split(":");
      return g._setFont(f[0], f[1]);
    }
    return g._setFont(f, s);
  };
}

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
    MESSAGES.forEach(m => delete m.h); // we don't want this in storage
    require("messages").save(MESSAGES);
    delete MESSAGES;
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
// used by lib.js to inform app of updates
function onCall(event) {
  if (event.t==="remove") {
    call = undefined;
    if (active==="call") showBack();
  } else {
    // incoming call: show it
    call = event;
    showCall();
  }
}
function onMusic(event) {
  const hadMusic = !!music;
  // music is never removed: only added/updated
  music = Object.assign(music || {}, event);
  if (active==="music") showMusic(); // update music screen
  else if (active==="menu" && !hadMusic) {
    if (settings.openMusic) showMusic();
    else showMenu(); // refresh menu: add "Music" entry
  }
}
function onMap(event) {
  const hadMap = !!map;
  if (event.t==="remove") {
    map = undefined;
    if (active==="map") showMenu(); // map is gone
    else if (active==="menu" && hadMap) showMenu(); // refresh menu: remove "Map" entry
  } else {
    map = event;
    if (["map", "music"].includes(active)) showMap(); // update map screen, or switch away from music (not other screens)
    else if (active==="menu" && !hadMap) showMenu(); // refresh menu: add "Map" entry
  }
}
function onMessageRemoved(idx) {
  if (!messageList.includes(idx)) return; // we don't care
  const newList = messageList.filter(i => i!==idx).map(i => i>idx ? i-1 : i), // decrement all indices after this one
    newIdx = messageIdx>idx ? messageIdx-1 : messageIdx;
  if (active==="menu") return showMenu(); // update message count
  if (active==="messages") {
    if (newList.length===0) { // removed last message
      if (unreadTimeout) load();
      else showMenu();
    } else if (messageIdx===idx) { // we were reading this exact message :-(
      showMessages(newList, messageList.indexOf(idx));
    } else {
      showMessages(newList, newList.indexOf(newIdx));
    }
  } else {
    messageList = newList;
    messageIdx = newIdx;
  }
}
function onMessageModified(idx) {
  if (!MESSAGES[idx]) return onMessageRemoved(idx);
  if (MESSAGES[idx] && MESSAGES[idx].new && !((require("Storage").readJSON("setting.json", 1) || {}).quiet)) {
    if (WIDGETS["messages"]) WIDGETS["messages"].buzz();
    else Bangle.buzz();
  }
  if (active==="call") return; // don't switch away from incoming call
  let other; // other messages to show after this
  if (active==="messages") other = messageList.filter(i => i!==idx); // already on message screen: keep list
  else other = MESSAGES.map((m, i) => i).filter((m, i) => MESSAGES[i].new && i!==idx); // append other new messages
  // show modified message (if any), followed by other messages
  const toShow = (MESSAGES[idx] ? [idx] : []).concat(other);
  if (toShow.length) showMessages(toShow);
  else if (["messages", "menu"].includes(active)) showMenu();
}

function getMusicImage() {
  return atob("FhaBAH//+/////////////h/+AH/4Af/gB/+H3/7/f/v9/+/3/7+f/vB/w8H+Dwf4PD/x/////////////3//+A=");
}
function getBackImage() {
  return atob("FhYBAAAAEAAAwAAHAAA//wH//wf//g///BwB+DAB4EAHwAAPAAA8AADwAAPAAB4AAHgAB+AH/wA/+AD/wAH8AA==");
}
function getNotificationImage() {
  return atob("HBKBAD///8H///iP//8cf//j4//8f5//j/x/8//j/H//H4//4PB//EYj/44HH/Hw+P4//8fH//44///xH///g////A==");
}
function getFBIcon() {
  return atob("GBiBAAAAAAAAAAAYAAD/AAP/wAf/4A/48A/g8B/g+B/j+B/n+D/n/D8A/B8A+B+B+B/n+A/n8A/n8Afn4APnwADnAAAAAAAAAAAAAA==");
}
function getPosImage() {
  return atob("GRSBAAAAAYAAAcAAAeAAAfAAAfAAAfAAAfAAAfAAAfBgAfA4AfAeAfAPgfAD4fAA+fAAP/AAD/AAA/AAAPAAADAAAA==");
}
function getNegImage() {
  return atob("FhaBADAAMeAB78AP/4B/fwP4/h/B/P4D//AH/4AP/AAf4AB/gAP/AB/+AP/8B/P4P4fx/A/v4B//AD94AHjAAMA=");
}
/*
* icons should be 24x24px with 1bpp colors and transparancy
*/
function getMessageImage(msg) {
  if (msg.img) return atob(msg.img);
  const s = (msg.src || "").toLowerCase();
  if (s==="alarm" || s==="alarmclockreceiver") return atob("GBjBAP////8AAAAAAAACAEAHAOAefng5/5wTgcgHAOAOGHAMGDAYGBgYGBgYGBgYGBgYDhgYBxgMATAOAHAHAOADgcAB/4AAfgAAAAAAAAA=");
  if (s==="calendar") return atob("GBiBAAAAAAAAAAAAAA//8B//+BgAGBgAGBgAGB//+B//+B//+B9m2B//+B//+Btm2B//+B//+Btm+B//+B//+A//8AAAAAAAAAAAAA==");
  if (s==="facebook") return getFBIcon();
  if (s==="hangouts") return atob("FBaBAAH4AH/gD/8B//g//8P//H5n58Y+fGPnxj5+d+fmfj//4//8H//B//gH/4A/8AA+AAHAABgAAAA=");
  if (s==="home assistant") return atob("FhaBAAAAAADAAAeAAD8AAf4AD/3AfP8D7fwft/D/P8ec572zbzbNsOEhw+AfD8D8P4fw/z/D/P8P8/w/z/AAAAA=");
  if (s==="instagram") return atob("GBiBAAAAAAAAAAAAAAAAAAP/wAYAYAwAMAgAkAh+EAjDEAiBEAiBEAiBEAiBEAjDEAh+EAgAEAwAMAYAYAP/wAAAAAAAAAAAAAAAAA==");
  if (s==="gmail") return getNotificationImage();
  if (s==="google home") return atob("GBiCAAAAAAAAAAAAAAAAAAAAAoAAAAAACqAAAAAAKqwAAAAAqroAAAACquqAAAAKq+qgAAAqr/qoAACqv/6qAAKq//+qgA6r///qsAqr///6sAqv///6sAqv///6sAqv///6sA6v///6sA6v///qsA6qqqqqsA6qqqqqsA6qqqqqsAP7///vwAAAAAAAAAAAAAAAAA==");
  if (s==="mail") return getNotificationImage();
  if (s==="messenger") return getFBIcon();
  if (s==="outlook mail") return getNotificationImage();
  if (s==="phone") return atob("FxeBABgAAPgAAfAAB/AAD+AAH+AAP8AAP4AAfgAA/AAA+AAA+AAA+AAB+AAB+AAB+OAB//AB//gB//gA//AA/8AAf4AAPAA=");
  if (s==="skype") return atob("GhoBB8AAB//AA//+Af//wH//+D///w/8D+P8Afz/DD8/j4/H4fP5/A/+f4B/n/gP5//B+fj8fj4/H8+DB/PwA/x/A/8P///B///gP//4B//8AD/+AAA+AA==");
  if (s==="slack") return atob("GBiBAAAAAAAAAABAAAHvAAHvAADvAAAPAB/PMB/veD/veB/mcAAAABzH8B3v+B3v+B3n8AHgAAHuAAHvAAHvAADGAAAAAAAAAAAAAA==");
  if (s==="sms message") return getNotificationImage();
  if (s==="threema") return atob("GBjB/4Yx//8AAAAAAAAAAAAAfgAB/4AD/8AH/+AH/+AP//AP2/APw/APw/AHw+AH/+AH/8AH/4AH/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
  if (s==="twitter") return atob("GhYBAABgAAB+JgA/8cAf/ngH/5+B/8P8f+D///h///4f//+D///g///wD//8B//+AP//gD//wAP/8AB/+AB/+AH//AAf/AAAYAAA");
  if (s==="telegram") return atob("GBiBAAAAAAAAAAAAAAAAAwAAHwAA/wAD/wAf3gD/Pgf+fh/4/v/z/P/H/D8P/Acf/AM//AF/+AF/+AH/+ADz+ADh+ADAcAAAMAAAAA==");
  if (s==="whatsapp") return atob("GBiBAAB+AAP/wAf/4A//8B//+D///H9//n5//nw//vw///x///5///4///8e//+EP3/APn/wPn/+/j///H//+H//8H//4H//wMB+AA==");
  if (s==="wordfeud") return atob("GBgCWqqqqqqlf//////9v//////+v/////++v/////++v8///Lu+v8///L++v8///P/+v8v//P/+v9v//P/+v+fx/P/+v+Pk+P/+v/PN+f/+v/POuv/+v/Ofdv/+v/NvM//+v/I/Y//+v/k/k//+v/i/w//+v/7/6//+v//////+v//////+f//////9Wqqqqqql");
  if (msg.id==="music") return getMusicImage();
  if (msg.id==="back") return getBackImage();
  return getNotificationImage();
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
    "facebook": "#4267b2",
    "gmail": "#ea4335",
    "google home": "#fbbc05",
    "home assistant": "#fff", // ha-blue is #41bdf5, but that's the background
    "hangouts": "#1ba261",
    "instagram": "#dd2a7b",
    "messenger": "#0078ff",
    "outlook mail": "#0072c6",
    "skype": "#00aff0",
    "slack": "#e51670",
    "threema": "#000",
    "telegram": "#0088cc",
    "twitter": "#1da1f2",
    "whatsapp": "#4fce5d",
    "wordfeud": "#e7d3c7",
  }[(msg.src || "").toLowerCase()] || (def!==undefined ? def : g.theme.fg);
}

function showMap() {
  setActive("map");
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
  let goBack = () => showBack();
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
  active = "music";
  clearStuff();
  let trackScrollOffset = 0;
  let artistScrollOffset = 0;
  let albumScrollOffset = 0;
  let trackName = "";
  let artistName = "";
  let albumName = "";

  function fmtTime(s) {
    const m = Math.floor(s/60);
    s = (parseInt(s%60)).toString().padStart(2, 0);
    return m+":"+s;
  }
  function reduceStringAndPad(text, offset, maxLen) {
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

  let layout = new Layout({
    type: "v", c: [
      {
        type: "h", fillx: 1, bgCol: g.theme.bg2, col: g.theme.fg2, c: [
          {type: "img", pad: 10, bgCol: g.theme.bg2, col: g.theme.fg2, src: getMusicImage},
          {
            type: "v", fillx: 1, c: [
              {type: "txt", font: fontMedium, col: g.theme.fg2, bgCol: g.theme.bg2, label: artistName, pad: 2, id: "artist"},
              {type: "txt", font: fontMedium, col: g.theme.fg2, bgCol: g.theme.bg2, label: albumName, pad: 2, id: "album"}
            ]
          }
        ]
      },
      {type: "txt", font: fontHuge, bgCol: g.theme.bg, label: trackName, fillx: 1, filly: 1, pad: 2, id: "track"},
      {type: "txt", font: fontMedium, bgCol: g.theme.bg, label: music.dur ? fmtTime(music.dur) : "--:--"}
    ]
  });
  layout.render();
  const goBack = () => showMenu();
  Bangle.setUI({
    mode: "updown",
    back: B2 ? () => goBack() : undefined,
  }, ud => {
    if (!Bangle.musicControl) return;
    if (ud) Bangle.musicControl(ud>0 ? "volumedown" : "volumeup");
    else toggleMusic();
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
  unreadTimeout = undefined;
}
function clearStuff() {
  delete Bangle.appRect;
  layout = undefined;
  Bangle.setUI();
  clearUnreadTimeout();
  ["touch", "drag", "swipe"].forEach(l => Bangle.removeAllListeners(l));
  if (updateLabelsInterval) clearInterval(updateLabelsInterval);
  updateLabelsInterval = undefined;
  g.clearRect(Bangle.appRect);
}
function setActive(screen, args) {
  clearStuff();
  if (last!==screen) last = active;
  if (screen==="messages") messageList = args;
  active = screen;
}
function showBack() {
  if (last==="call" && call) showCall();
  else if (last==="map" && map) showMap();
  else if (last==="music" && music) showMusic();
  else if (last==="messages" && messageList.length) showMessages(messageList.filter(idx => MESSAGES[idx]));
  else showMenu();
}
function showMenu() {
  setActive("menu");
  let menu = {
    "": {title:/*LANG*/"Messages"},
    /*LANG*/"< Back": () => load(),
  };
  if (call) menu[/*LANG*/"Incoming call"] = () => showCall();
  // showMessage wants MESSAGES indices
  const unread = MESSAGES.map((m, i) => i).filter(i => MESSAGES[i].new),
    all = MESSAGES.map((m, i) => i);
  if (unread.length) {
    menu[unread.length+" "+/*LANG*/"New"] = () => showMessages(unread);
    if (all.length) menu[/*LANG*/"All"+` (${MESSAGES.length})`] = () => showMessages(all);
  } else {
    if (all.length) menu[MESSAGES.length+" "+/*LANG*/"Messages"] = () => showMessages(all);
    else menu[/*LANG*/"No Messages"] = undefined;
  }
  if (MESSAGES.length) {
    menu[/*LANG*/"Delete all"] = () => {
      E.showPrompt(/*LANG*/"Are you sure?", {title:/*LANG*/"Delete All Messages"}).then(isYes => {
        if (isYes) MESSAGES = [];
        showMenu();
      });
    };
  }
  if (map) menu[/*LANG*/"Map"] = () => showMap();
  if (music) menu[/*LANG*/"Music"] = () => showMusic();
  menu[/*LANG*/"Settings"] = () => showSettings();
  E.showMenu(menu);
}
function showSettings() {
  setActive("settings");
  eval(require("Storage").read("messages.settings.js"))(() => {
    settings = require("Storage").readJSON("messages.settings.json", true) || {};
    MESSAGES.forEach(m => delete m.h); // in case font size changed
    showMenu();
  });
}
function showCall() {
  setActive("call");
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
    showBack();
  }
  let options = {};
  if (!B2) {
    options.btns = [
      {
        label:/*LANG*/"accept",
        cb: () => respond(true),
      }, {
        label:/*LANG*/"ignore",
        cb: () => showBack(),
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
          {type: "img", pad: 10, src: getMessageImage(call), col: getMessageImageCol(call)},
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
          {type: B2 ? "btn" : "img", src: getNegImage(), cb: () => respond(false)},
          {fillx: 1},
          {type: B2 ? "btn" : "img", src: getPosImage(), cb: () => respond(true)},
        ]
      }
    ]
  }, options);
  layout.render();
  Bangle.setUI({
    mode: "custom",
    back: () => showBack(),
    touch: side => {
      if (side===1) respond(false);
      if (side===2) respond(true);
    },
    btn: b => {
      if (B2 || b===2) showBack();
      else if (b===1) respond(true);
      else respond(false);
    }
  });
}
function getMessageHeight(msg, footer) {
  if (msg.h) return msg.h;
  let h = 0, lines;

  // header:
  h += 4; // 2x2 padding
  h += g.setFont(fontSmall).stringMetrics(msg.src).height;
  let w = g.getWidth()-46; // room for icon(22)+padding(2x10+2x2)
  let title = msg.title, titleFont = fontHuge;
  if (title) {
    h += 2; // padding
    if (g.setFont(titleFont).stringWidth(title)>w) {
      titleFont = fontBig;
      if (settings.fontSize!==1 && g.setFont(titleFont).stringWidth(title)>w) {
        titleFont = fontMedium;
      }
    }
    lines = g.setFont(titleFont).wrapString(title, w);
    h += g.stringMetrics(lines.join("\n")).height;
  }
  h = Math.max(42, h); // at least icon(22)+padding(2x10)

  // body:
  h += 4; // 2x2 padding
  w = g.getWidth()-10;
  let body = msg.body, bodyFont = fontHuge;
  if (g.setFont(bodyFont).stringWidth(body)>w*2) {
    bodyFont = fontBig;
    if (settings.fontSize!==1 && g.setFont(bodyFont).stringWidth(body)>w*3) {
      bodyFont = fontMedium;
    }
  }
  lines = g.setFont(bodyFont).wrapString(body, w);
  h += g.stringMetrics(lines.join("\n")).height;

  // footer:
  if (footer) {
    h += g.setFont(fontSmall).stringMetrics(footer).height;
  }

  // remember for next time
  msg.h = h;

  return h;
}
function deleteMessage() {
  let idx = messageIdx, msg = MESSAGES[idx];
  Bangle.messageResponse(msg, false);
  MESSAGES.splice(idx, 1);
  const inList = messageList.indexOf(idx);
  if (inList>=0) messageList.splice(inList, 1);
  if (messageList.length<1) showBack(); // no more messages
  else showMessages(messageList, inList);
}
function showMessageMenu() {
  clearStuff();
  let menu = {
    /*LANG*/"< Back": () => showMessages(messageList, messageIdx),
  };
  for(let label in REPLIES) {
    menu[label] = () => {
      Bangle.messageResponse(MESSAGES[messageIdx], REPLIES[label]);
      showMessages(messageList, messageIdx);
    };
  }
  menu[/*LANG*/"Delete"] = () => deleteMessage();
  E.showMenu(menu);
}
/**
 * Show a list of messages
 *
 * @param {array<number>} idxs Indices in MESSAGES to show
 * @param {number} [messageNum=0] Index in idxs of message to show, default to 0
 */
function showMessages(idxs, messageNum) {
  idxs = idxs.filter(i => MESSAGES[i]); // make sure all those messages still exist
  setActive("messages", idxs);
  if (!idxs.length) {
    // I /think/ this should never happen...
    return E.showPrompt(/*LANG*/"No Messages", {
      title:/*LANG*/"Messages",
      img: require("heatshrink").decompress(atob("kkk4UBrkc/4AC/tEqtACQkBqtUDg0VqAIGgoZFDYQIIM1sD1QAD4AIBhnqA4WrmAIBhc6BAWs8AIBhXOBAWz0AIC2YIC5wID1gkB1c6BAYFBEQPqBAYXBEQOqBAnDAIQaEnkAngaEEAPDFgo+IKA5iIOhCGIAFb7RqAIGgtUBA0VqobFgNVA")),
      buttons: {/*LANG*/"Ok": 1}
    }).then(() => { showMenu(); });
  }
  if (messageNum<0) messageNum = messageIdx; // deleted: show message now at position we were
  if (!messageNum) messageNum = 0; // no number: show first
  if (messageNum>=idxs.length) messageNum = idxs.length-1; // we deleted the very last message
  let n, // message number of idxs
    idx, // index of message in MESSAGES
    msg, // actual message
    h,   // message height
    offset, oldOffset;
  const ar = Bangle.appRect;
  const move = (dy) => {
    moving = true; // prevent scrolling right into next/prev message
    offset = Math.max(0, Math.min(h-ar.h, offset+dy)); // clip at message height
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
    g.clearRect(ar).setClipRect(ar.x, ar.y, ar.x2, ar.y2);
    g.reset = () => { // stop Layout resetting ClipRect
      g.setColor(g.theme.fg).setBgColor(g.theme.bg);
    };
    layout.render();
    delete g.reset;
  };
  let buzzing = false, moving = false;
  const buzzOnce = () => {
    if (buzzing) return;
    buzzing = true;
    Bangle.buzz(50).then(() => setTimeout(() => {buzzing = false;}, 500));
  };
  const showMsg = num => {
    clearStuff();
    n = num;
    idx = idxs[n];
    messageIdx = idx;
    msg = MESSAGES[idx];
    let footer = idxs.length>1 ? `${n+1}/${idxs.length}` : "";
    h = Math.max(getMessageHeight(msg, footer), ar.h);
    offset = 0;
    oldOffset = 0;
    layout = getMessageLayout(msg, footer);
    // lie to Layout library about available space
    Bangle.appRect = Object.assign({}, ar, {h: h, y2: ar.y+h-1});
    layout.update();
    delete Bangle.appRect;
    draw();
    if (B2) {
      Bangle.setUI({
        mode: "custom",
        back: () => {
          messageList = [];
          showBack();
        },
        swipe: dir => {
          delete msg.new;
          if (dir===1) showBack();
          else if (dir=== -1) showMessageMenu();
        },
        drag: e => {
          delete msg.new;
          const dy = e.dy;
          if (dy<0) { // up
            if (h>ar.h && offset<h-ar.h) {
              move(-dy);
            } else if (n<idxs.length-1) { // bottom reached: show next
              if (!moving) { // don't scroll right through to next message
                Bangle.buzz(30);
                showMsg(n+1);
              }
            } else {
              buzzOnce(); // already at bottom of last message
            }
          } else if (dy>0) {// down
            if (offset>0) {
              move(-dy);
            } else if (n>0) { // top reached: show prev
              if (!moving) { // don't scroll right through to previous message
                Bangle.buzz(30);
                showMsg(n-1);
              }
            } else {
              buzzOnce(); // already at top of first message
            }
          }
          if (!e.b) moving = false; // touch stopped: we can swipe to another message (if we reached the top/bottom)
        }
      });
    } else {
      Bangle.setUI({
        mode: "updown",
        back: () => {
          messageList = [];
          showBack();
        },
      }, dir => {
        delete msg.new;
        const STEP = 50;
        if (dir=== -1) { // up
          if (h>ar.h && offset<h-ar.h) {
            move(+STEP);
          } else if (n<idxs.length-1) { // bottom reached: show next
            Bangle.buzz(30);
            showMsg(n+1);
          } else {
            buzzOnce(); // already at bottom of last message
          }
        } else if (dir===1) { // down
          if (offset>0) {
            move(-STEP);
          } else if (n>0) { // top reached: show previous
            Bangle.buzz(30);
            showMsg(n-1);
          } else {
            buzzOnce(); // already at top of first message
          }
        }
      });
    }
  };
  showMsg(messageNum);
}

function getMessageLayout(msg, footer) {
  // Normal text message display
  let title = msg.title, titleFont = fontHuge, w;
  if (title) {
    w = g.getWidth()-48;
    if (g.setFont(titleFont).stringWidth(title)>w) {
      titleFont = fontBig;
      if (settings.fontSize!==1 && g.setFont(titleFont).stringWidth(title)>w) {
        titleFont = fontMedium;
      }
    }
    title = g.setFont(titleFont).wrapString(title, w).join("\n");
  }
  // If body of message is only two lines long w/ large font, use large font.
  let body = msg.body, bodyFont = fontHuge;
  if (body) {
    w = g.getWidth()-10;
    if (g.setFont(bodyFont).stringWidth(body)>w*2) {
      bodyFont = fontBig;
      if (settings.fontSize!==1 && g.stringWidth(body)>w*3) {
        bodyFont = fontMedium;
      }
    }
    body = g.setFont(bodyFont).wrapString(msg.body, w).join("\n");
  }

  layout = new Layout({
    type: "v", c: [
      {
        type: "h", fillx: 1, bgCol: g.theme.bg2, col: g.theme.fg2, c: [
          {type: "img", pad: 10, src: getMessageImage(msg), col: getMessageImageCol(msg)},
          {
            type: "v", fillx: 1, c: [
              {type: "txt", font: fontSmall, label: msg.src ||/*LANG*/"Message", bgCol: g.theme.bg2, col: g.theme.fg2, fillx: 1, pad: 2, halign: 1},
              title ? {type: "txt", font: titleFont, label: title, bgCol: g.theme.bg2, col: g.theme.fg2, fillx: 1, pad: 2} : {},
            ]
          },
        ]
      },
      {type: "txt", font: bodyFont, label: body, fillx: 1, filly: 1, pad: 2},
      footer ? {type: "txt", font: fontSmall, label: footer, halign: 1} : {},
    ]
  });
  return layout;
}

let call, music, map, messageIdx, messageList = [];
if (MESSAGES!==undefined) { // only if loading MESSAGES worked
  g.clear();
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  let idx = MESSAGES.findIndex(m => m.id==="call");
  if (idx>=0) call = MESSAGES.splice(idx, 1)[0];
  idx = MESSAGES.findIndex(m => m.id==="music");
  if (idx>=0) music = MESSAGES.splice(idx, 1)[0];
  idx = MESSAGES.findIndex(m => m.id==="map");
  if (idx>=0) map = MESSAGES.splice(idx, 1)[0];
  // check if we were autoloaded for a text message, and for which message(s)
  const autoload = MESSAGES.map((m, i) => i).filter(i => MESSAGES[i].load);
  // clear autoload status from messages
  MESSAGES.forEach(m => delete m.load);

  if (call && call.load) showCall(call);
  else if (autoload.length) showMessages(autoload);
  else if (map && map.load) showMap(map);
  else if (music && music.load) showMusic(music);
  else if (MESSAGES.some(m => m.new)) showMessages(MESSAGES.map((m, i) => i).filter(i => MESSAGES[i].new));
  else if (MESSAGES.length) showMessages(MESSAGES.map((m, i) => i));
  else showMenu();

  if ((!call || !call.load) && autoload.length) {
    // autoloaded for message(s): autoclose as well
    let unreadTimeoutSecs = settings.unreadTimeout;
    if (unreadTimeoutSecs===undefined) unreadTimeoutSecs = 60;
    if (unreadTimeoutSecs) {
      unreadTimeout = setTimeout(function() {
        print("Message not seen - reloading");
        load();
      }, unreadTimeoutSecs*1000);
      ["touch", "drag", "swipe"].forEach(l => Bangle.on(l, clearUnreadTimeout));
    }
  }
}
