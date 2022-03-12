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
const fontLarge = g.getFonts().includes("6x15") ? "6x15:2" : "6x8:4";
let active; // active screen
let openMusic = false, openMap = false; // go back to map/music screen after we handle something else?
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
    if (active==="call") showMain();
  } else {
    call = event;
    showCall();
  }
}
function onMusic(event) {
  const hadMusic = !!music;
  music = Object.assign(music || {}, event);
  if (active==="music") showMusic();
  else if (active==="menu" && !hadMusic) showMenu();
}
function onMap(event) {
  const hadMap = !!map;
  if (event.t==="remove") {
    map = undefined;
    if (active==="map") showMain();
    else if (active==="menu" && hadMap) showMenu();
  } else {
    map = event;
    if (["map", "music"].includes(active)) showMap();
    else if (active==="menu" && !hadMap) showMenu();
  }
}
const onMessages = function(idxs) {
  if (!idxs.some(i => MESSAGES[i]) && active!=="messages") return; // nothing to show
  if (idxs.some(i => MESSAGES[i] && MESSAGES[i].new) && !((require("Storage").readJSON("setting.json", 1) || {}).quiet)) {
    if (WIDGETS["messages"]) WIDGETS["messages"].buzz();
    else Bangle.buzz();
  }
  if (active==="call") return;
  // show modified messages, followed by any other new messages
  const unread = MESSAGES.filter((m, i) => m && m.new && !idxs.includes(i)).map((m, i) => i);
  showMessages(idxs.filter(i => MESSAGES[i]).concat(unread));
};

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
  clearStuff();
  active = "map";
  openMap = true;
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
          {type: "txt", font: fontLarge, label: street}
        ]
      },
      {
        type: "h", fillx: 1, filly: 1, c: [
          map.img ? {type: "img", src: atob(map.img), scale: 2} : {},
          {
            type: "v", fillx: 1, c: [
              {type: "txt", font: fontLarge, label: distance || ""}
            ]
          },
        ]
      },
      {type: "txt", font: "6x8:2", label: eta}
    ]
  });
  layout.render();
  // go back to menu on any input
  let goBack = () => {
    openMap = false;
    showMenu();
  };
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
  openMusic = music.state==="play";
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
      {type: "txt", font: fontLarge, bgCol: g.theme.bg, label: trackName, fillx: 1, filly: 1, pad: 2, id: "track"},
      {type: "txt", font: fontMedium, bgCol: g.theme.bg, label: music.dur ? fmtTime(music.dur) : "--:--"}
    ]
  });
  layout.render();
  const goBack = () => {
    openMusic = false;
    showMenu();
  };
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
function clearStuff() {
  delete Bangle.appRect;
  layout = undefined;
  Bangle.setUI();
  ["touch", "drag", "swipe"].forEach(l => Bangle.removeAllListeners(l));
  if (unreadTimeout) clearTimeout(unreadTimeout);
  unreadTimeout = undefined;
  if (updateLabelsInterval) clearInterval(updateLabelsInterval);
  updateLabelsInterval = undefined;
  g.clearRect(Bangle.appRect);
}
function showMain() {
  if (map && openMap) showMap();
  else if (music && openMusic) showMusic();
  else showMenu();
}
function showMenu() {
  active = "menu";
  clearStuff();
  let menu = {
    "": {title:/*LANG*/"Messages"},
    /*LANG*/"< Back": () => load(),
  };
  if (call) menu[/*LANG*/"Incoming call"] = () => showCall();
  const unread = MESSAGES.filter(m => m.new);
  if (unread.length) menu[unread.length+" "+/*LANG*/"New"] = () => showMessages(unread.map((m, i) => i));
  if (MESSAGES.length) menu[/*LANG*/"All "+` (${MESSAGES.length})`] = () => showMessages(MESSAGES.map((m, i) => i));
  else menu[/*LANG*/"No Messages"] = () => showMessages(MESSAGES.map((m, i) => i));
  if (map) menu[/*LANG*/"Map"] = () => showMap();
  if (music) menu[/*LANG*/"Music"] = () => showMusic();
  menu[/*LANG*/"Settings"] = () => showSettings();
  E.showMenu(menu);
}
function showSettings() {
  active = "settings";
  eval(require("Storage").read("messages.settings.js"))(() => {
    settings = require("Storage").readJSON("messages.settings.json", true) || {};
    MESSAGES.forEach(m => delete m.h); // in case font size changed
    showMenu();
  });
}
function showCall() {
  active = "call";
  clearStuff();
  // Normal text message display
  let title = call.title, titleFont = fontLarge, lines, w;
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
  let body = call.body, bodyFont = fontLarge;
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
    showMain();
  }
  let options = {};
  if (!B2) {
    options.btns = [
      {
        label:/*LANG*/"accept",
        cb: () => respond(true),
      }, {
        label:/*LANG*/"ignore",
        cb: () => showMain(),
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
          {type: B2 ? "btn" : "img", src: getPosImage(), cb: () => respond(true)},
          {fillx: 1},
          {type: B2 ? "btn" : "img", src: getNegImage(), cb: () => respond(false)}
        ]
      }
    ]
  }, options);
  layout.render();
  Bangle.setUI({
    mode: "custom",
    back: () => showMain(),
    swipe: dir => {if (dir===1) showMenu();},
    touch: side => {
      if (side===1) respond(true);
      if (side===2) respond(false);
    },
    btn: b => {
      if (B2 || b===2) showMenu();
      else if (b===1) respond(true);
      else respond(false);
    }
  });
}
function getMessageHeight(msg) {
  if (msg.h) return msg.h;
  let h = 0;
  // header:
  let w = g.getWidth()-48; // room for icon
  let title = msg.title, titleFont = fontLarge;
  if (g.setFont(titleFont).stringWidth(title)>w) {
    titleFont = fontBig;
    if (settings.fontSize!==1 && g.setFont(titleFont).stringWidth(title)>w) {
      titleFont = fontMedium;
    }
  }
  let lines = g.setFont(titleFont).wrapString(title, w);
  h += Math.max(48, g.stringMetrics(lines.join("\n")).height); // at least icon height

  // body:
  w = g.getWidth()-10;
  let body = msg.body, bodyFont = fontLarge;
  if (g.setFont(bodyFont).stringWidth(body)>w*2) {
    bodyFont = fontBig;
    if (settings.fontSize!==1 && g.setFont(bodyFont).stringWidth(body)>w*3) {
      bodyFont = fontMedium;
    }
  }
  lines = g.setFont(bodyFont).wrapString(body, w);
  h += g.stringMetrics(lines.join("\n")).height;

  // remember for next time
  msg.h = h;

  return h;
}
function showMessages(idxs) {
  clearStuff();
  active = "messages";
  if (!idxs.length) {
    return E.showPrompt(/*LANG*/"No Messages", {
      title:/*LANG*/"Messages",
      img: require("heatshrink").decompress(atob("kkk4UBrkc/4AC/tEqtACQkBqtUDg0VqAIGgoZFDYQIIM1sD1QAD4AIBhnqA4WrmAIBhc6BAWs8AIBhXOBAWz0AIC2YIC5wID1gkB1c6BAYFBEQPqBAYXBEQOqBAnDAIQaEnkAngaEEAPDFgo+IKA5iIOhCGIAFb7RqAIGgtUBA0VqobFgNVA")),
      buttons: {/*LANG*/"Ok": 1}
    }).then(() => { showMenu(); });
  }
  let n, // message number of idxs
    idx, // index of message in MESSAGES
    msg, // the actual message
    h,   // message height
    offset, oldOffset;
  const ar = Bangle.appRect;
  const move = (dy) => {
    moving = true; // prevent scrolling right into next/prev message
    offset = Math.max(0, Math.min(h-ar.h, offset+dy));
    dy = oldOffset-offset;
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
    // move all elements to new offset
    layout.render();
    delete g.reset;
  };
  let buzzing = false, moving = false;
  const buzzOnce = () => {
    if (buzzing) return;
    buzzing = true;
    Bangle.buzz(40).then(() => setTimeout(() => {buzzing = false;}, 500));
  };
  const showMsg = num => {
    n = num;
    idx = idxs[n];
    msg = MESSAGES[idx];
    h = Math.max(getMessageHeight(msg), ar.h);
    offset = 0;
    oldOffset = 0;
    layout = getMessageLayout(msg, idxs.length>1 ? `${n+1}/${idxs.length}` : "");
    // lie to Layout library about available space
    Bangle.appRect = Object.assign({}, ar, {h: h, y2: ar.y+h-1});
    layout.update();
    delete Bangle.appRect;
    let askDelete = () => {
      E.showPrompt(/*LANG*/"Delete message?").then(confirm => {
        if (!confirm) return showMsg(n);
        Bangle.messageResponse(msg, false);
        MESSAGES.splice(idx, 1);
        idxs.splice(n, 1);
        if (idxs.length<1) showMenu(); // no more messages
        else if (n<idxs.length) showMsg(n); // next message took this one's place
        else showMsg(n-1); // deleted last message
      });
    };
    draw();
    if (!B2) {
      Bangle.setUI("updown", dir => {
        delete msg.new;
        const STEP = 50;
        if (dir=== -1) { // up
          if (h>ar.h && offset<h-ar.h) {
            move(+STEP);
          } else if (n<idxs.length-1) { // bottom reached: show next
            Bangle.buzz(30);
            showMsg(n+1);
          } else {
            buzzOnce();
          }
        } else if (dir===1) { // down
          if (offset>0) {
            move(-STEP);
          } else if (n>0) { // top reached: show prev
            Bangle.buzz(30);
            showMsg(n-1);
          } else {
            buzzOnce();
          }
        } else { // middle button
          showMessageMenu();
        }
      });
    } else {
      Bangle.setUI({
        mode: "custom",
        back: () => showMain(),
        swipe: dir => {
          delete msg.new;
          if (dir===1) showMenu();
          else if (dir=== -1) {
            Bangle.buzz(30);
            askDelete();
          }
        },
        touch: side => {
          delete msg.new;
          showMessageMenu();
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
              buzzOnce();
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
              buzzOnce();
            }
          }
          if (!e.b) moving = false; // touch stopped: we can swipe to another message (if we reached the top/bottom)
        }
      });
    }
  };
  showMsg(0);
}

function getMessageLayout(msg, footer) {
  // Normal text message display
  let title = msg.title, titleFont = fontLarge, w;
  if (title) {
    w = g.getWidth()-48;
    if (g.setFont(titleFont).stringWidth(title)>w) {
      titleFont = fontBig;
      if (settings.fontSize!==1 && g.setFont(titleFont).stringWidth(title)>w) {
        titleFont = fontMedium;
      }
    }
    if (g.setFont(titleFont).stringWidth(title)>w) {
      title = g.wrapString(title, w).join("\n");
    }
  }
  // If body of message is only two lines long w/ large font, use large font.
  let body = msg.body, bodyFont = fontLarge;
  if (body) {
    w = g.getWidth()-10;
    if (g.setFont(bodyFont).stringWidth(body)>w*2) {
      bodyFont = fontBig;
      if (settings.fontSize!==1 && g.setFont(bodyFont).stringWidth(body)>w*3) {
        bodyFont = fontMedium;
      }
    }
    if (g.setFont(bodyFont).stringWidth(body)>w) {
      body = g.setFont(bodyFont).wrapString(msg.body, w).join("\n");
    }
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
      footer ? {type: "txt", font: fontSmall, label: footer} : {},
    ]
  });
  return layout;
}

let call, music, map;
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
  else if (autoload.length) onMessages(autoload);
  else if (map && map.load) showMap(map);
  else if (music && music.load) showMusic(music);
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
    }
  }
}
