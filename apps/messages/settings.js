(function(back) {
  function settings() {
    let settings = require("Storage").readJSON("messages.settings.json", true) || {};
    if (settings.vibrate===undefined) settings.vibrate = ".";
    if (settings.repeat===undefined) settings.repeat = 4;
    if (settings.unreadTimeout===undefined) settings.unreadTimeout = 60;
    settings.showRead = !!settings.showRead;
    settings.openMusic = !!settings.openMusic;
    settings.debugLog = !!settings.debugLog;
    settings.maxUnreadTimeout = 240;
    return settings;
  }
  function updateSetting(setting, value) {
    let settings = require("Storage").readJSON("messages.settings.json", true) || {};
    settings[setting] = value;
    require("Storage").writeJSON("messages.settings.json", settings);
    if (setting==="vibrate") { // demonstrate now
      function b() {
        const c = value[0];
        value = value.substring(1);
        if (c===".") Bangle.buzz().then(() => setTimeout(b, 100));
        if (c==="-") Bangle.buzz(500).then(() => setTimeout(b, 100));
      }
      b();
    }
  }

  const vibPatterns = [".", "-", "--", ".-", "-.-", "---"];
  function showSettingsMenu() {
    let menu = {
      "": {"title": /*LANG*/"Messages"},
      "< Back": back,
      /*LANG*/"Vibrate": {
        value: Math.max(0, vibPatterns.indexOf(settings().vibrate)),
        min: 0, max: vibPatterns.length, // max is out of bounds, for "Off"
        format: v => vibPatterns[v] || /*LANG*/"Off",
        onchange: v => {
          updateSetting("vibrate", vibPatterns[v] || "");
        }
      },
      /*LANG*/"Repeat": {
        value: settings().repeat,
        min: 0, max: 10,
        format: v => v ? v+"s" :/*LANG*/"Off",
        onchange: v => updateSetting("repeat", v)
      },
      /*LANG*/"Unread timer": {
        value: settings().unreadTimeout,
        min: 0, max: settings().maxUnreadTimeout, step: 10,
        format: v => v ? v+"s" :/*LANG*/"Off",
        onchange: v => updateSetting("unreadTimeout", v)
      },
      /*LANG*/"Min Font": {
        value: 0|settings().fontSize,
        min: 0, max: 1,
        format: v => [/*LANG*/"Small",/*LANG*/"Medium"][v],
        onchange: v => updateSetting("fontSize", v)
      },
      /*LANG*/"Show Read": {
        value: !!settings().showRead,
        format: v => v ?/*LANG*/"Yes" :/*LANG*/"No",
        onchange: v => updateSetting("showRead", v)
      },
      /*LANG*/"Auto-Open Music": {
        value: !!settings().openMusic,
        format: v => v ?/*LANG*/"Yes" :/*LANG*/"No",
        onchange: v => updateSetting("openMusic", v)
      },
      /*LANG*/"Debug Log": {
        value: !!settings().debugLog,
        format: v => v ?/*LANG*/"On" :/*LANG*/"Off",
        onchange: v => updateSetting("debugLog", v)
      },
    };
    if (MESSAGES && MESSAGES.length) { // only when in-app
      menu[/*LANG*/"Delete all"] = () => {
        E.showPrompt(/*LANG*/"Are you sure?", {title:/*LANG*/"Delete All Messages"}).then(isYes => {
          if (isYes) MESSAGES = [];
          showSettingsMenu();
        });
      };
    }
    E.showMenu(menu);
  }
  showSettingsMenu();
});
