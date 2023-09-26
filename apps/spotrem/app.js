{

  let setDevMode = ()=>{
    Bangle.setLCDTimeout(0); // Easier to read the screen while developing.
    Bangle.setLocked(false);
    Bangle.setLCDPower(0.5);
  };
  setDevMode();

  //////
  // Bluetooth.println(JSON.stringify({t:"intent", target:"", action:"", flags:["flag1", "flag2",...], categories:["category1","category2",...], package:"", class:"", mimetype:"", data:"", extra:{someKey:"someValueOrString", anotherKey:"anotherValueOrString",...}}));
  /////

  let R = Bangle.appRect;
  let widgetUtils = require("widget_utils");
  let backToMenu = false;
  let colorFG = g.theme.dark?0x07E0:0x03E0; // Green on dark theme, DarkGreen on light theme.

  // The main layout of the app
  let gfx = function() {
    widgetUtils.hide();
    R = Bangle.appRect;
    marigin = 8;
    // g.drawString(str, x, y, solid)
    g.clearRect(R);
    progressBar.f.draw(progressBar.v.level);
    g.reset();

    g.setColor(colorFG);
    g.setFont("4x6:2");
    g.setFontAlign(1, 0, 0);
    g.drawString("->", R.x2 - marigin, R.y + R.h/2);

    g.setFontAlign(-1, 0, 0);
    g.drawString("<-", R.x + marigin, R.y + R.h/2);

    g.setFontAlign(-1, 0, 1);
    g.drawString("<-", R.x + R.w/2, R.y + marigin);

    g.setFontAlign(1, 0, 1);
    g.drawString("->", R.x + R.w/2, R.y2 - marigin);

    g.setFontAlign(0, 0, 0);
    g.drawString("Play\nPause", R.x + R.w/2, R.y + R.h/2);

    g.setFontAlign(-1, -1, 0);
    g.drawString("Menu", R.x + 2*marigin, R.y + 2*marigin);

    g.setFontAlign(-1, 1, 0);
    g.drawString("Wake", R.x + 2*marigin, R.y + R.h - 2*marigin);

    g.setFontAlign(1, -1, 0);
    g.drawString("Srch", R.x + R.w - 2*marigin, R.y + 2*marigin);

    g.setFontAlign(1, 1, 0);
    g.drawString("Saved", R.x + R.w - 2*marigin, R.y + R.h - 2*marigin);
  };

  let isPaused = false;
  let playPause = "play";
  let toggle = ()=>{
    playPause = isPaused?"play":"pause";
    Bangle.musicControl(playPause);
    isPaused = !isPaused;
  };

  let bridgeOverToMenu = ()=>{
    if (!isPaused) progressBar.f.startAutoUpdate();
    Bangle.on('message', messageHandler);
    Bangle.on('audio', audioHandler);
  };

  // Touch handler for main layout
  let touchHandler = function(_, xy) {
    x = xy.x;
    y = xy.y;
    len = (R.w<R.h+1)?(R.w/3):(R.h/3);

    // doing a<b+1 seemed faster than a<=b, also using a>b-1 instead of a>b.
    if ((R.x-1<x && x<R.x+len) && (R.y-1<y && y<R.y+len)) {
      //Menu
      backToMenu = true;
      E.showMenu(spotifyMenu);
      bridgeOverToMenu();
    } else if ((R.x-1<x && x<R.x+len) && (R.y2-len<y && y<R.y2+1)) {
      //Wake
      gadgetbridgeWake();
    } else if ((R.x2-len<x && x<R.x2+1) && (R.y-1<y && y<R.y+len)) {
      //Srch
      E.showMenu(searchMenu);
      bridgeOverToMenu();
    } else if ((R.x2-len<x && x<R.x2+1) && (R.y2-len<y && y<R.y2+1)) {
      //Saved
      E.showMenu(savedMenu);
      bridgeOverToMenu();
    } else if ((R.x-1<x && x<R.x+len) && (R.y+R.h/2-len/2<y && y<R.y+R.h/2+len/2)) {
      //Previous
      spotifyWidget("PREVIOUS");
    } else if ((R.x2-len+1<x && x<R.x2+1) && (R.y+R.h/2-len/2<y && y<R.y+R.h/2+len/2)) {
      //Next
      spotifyWidget("NEXT");
    } else if ((R.x-1<x && x<R.x2+1) && (R.y-1<y && y<R.y2+1)){
      //play/pause
      toggle();
    }
  };

  let volIncrPreSync;

  // Swipe handler for main layout, used for next previous track.
  let swipeHandler = function(LR, _) {
    volIncrPreSync = 0; // updated inside cbVolumeSlider.
    if (LR===-1) {
      spotifyWidget("NEXT");
    }
    if (LR===1) {
      spotifyWidget("PREVIOUS");
    }
    if (LR===0){
      Bangle.musicControl("vg"); // vg = Volume Get level
      if (!volumeSlider.v.dragActive) {
        setTimeout(()=>{ // Timeout so gadgetbridge has time to send back volume levels.
          volumeSlider.c.steps=audioLevels.u;
          volumeSlider.v.level=audioLevels.c + volIncrPreSync;
        },200);
        Bangle.on('drag', volumeSlider.f.dragSlider);
      }
    }
  };

  let audioLevels = {u:30, c:15}; // Init with values to avoid "Uncaught Error: Cannot read property 'u' of undefined" if values were not gathered from Gadgetbridge.
  let audioHandler = (e)=>{audioLevels = e;};
  Bangle.on('audio', audioHandler);
  Bangle.musicControl("vg");

  let progressBar;
  let volumeSlider;

  //let iProgress=0;

  // cbProgressbar is used with progressBar
  let cbProgressbar = (mode,fb)=>{
    //    iProgress+=1;
    //    print(iProgress,"progress",mode,fb)
    //    if (mode== "remove") print("progressBar: "+mode)
    if (mode == "auto" && volumeSlider.v.dragActive) volumeSlider.f.draw(volumeSlider.v.level);
  };

  // Handle music messages
  // Bangle.emit("message", type, msg);
  let trackPosition = 0;
  let trackDur = 30;
  let trackState = "pause";
  let messageHandler = (type, msg)=>{
    print("\n","type:"+type, "t:"+msg.t, "src:"+msg.src, "mode:"+msg.state, "pos:"+msg.position, "dur:"+msg.dur);
    if (msg.src=="musicstate") { // `musicstate` messages arrive last. The positional info is contained there. To avoid yankiness only act once this has arrived.
      trackState = msg.state;
      trackPosition = msg.position + (trackState==="play"?1:0); // +1 to account for latency.
      trackDur = msg.dur;
      if (progressBar) {
        progressBar.f.stopAutoUpdate();
        progressBar.f.remove();
        initProgressBar(progressBar.v.shouldAutoDraw);
      }
    }
  };
  Bangle.on('message', messageHandler);

  // progressBar follows the media track playing on the android device.
  let initProgressBar = (shouldAutoDraw)=>{
    progressBar = require("Slider").create(
      cbProgressbar,
      {useMap:false, steps:trackDur, currLevel:trackPosition, horizontal:true, rounded:false, timeout:0, useIncr:false, immediateDraw:false, propagateDrag:true, width:2, xStart:R.y2-50, oversizeR:10, oversizeL:10, autoProgress:true, yStart: R.x+14, height: R.w-30 ,colorFG:colorFG, outerBorderSize:0, innerBorderSize:0}
    );
    progressBar.v.shouldAutoDraw = shouldAutoDraw;
    if (progressBar.v.shouldAutoDraw) progressBar.f.draw(progressBar.v.level);
    if (trackState==="play") progressBar.f.startAutoUpdate();
  };

  // Navigation input on the main layout
  let setUI = function() {
    // Bangle.setUI code from rigrig's smessages app for volume control: https://git.tubul.net/rigrig/BangleApps/src/branch/personal/apps/smessages/app.js

    // cbVolumeSlider is used with volumeSlider
    let cbVolumeSlider = (mode,fb)=>{
      if (mode =="map") Bangle.musicControl({cmd:"vs",extra:Math.round(100*fb/30)}); // vs = Volume Set level
      if (mode =="incr") {
        Bangle.musicControl(fb>0?"volumedown":"volumeup");
        volIncrPreSync-=fb; // used inside timeout in swipeHandler to account for incr done before sync with android volume level.
      }
      if (mode =="remove") {
        audioLevels.c = fb;
        ebLast = 0;
        gfx();
        progressBar.f.draw(progressBar.v.level);
      }
    };

    // volumeSlider controls volume level on the android device.
    volumeSlider=require("Slider").create(
      cbVolumeSlider,
      {useMap:true, steps:audioLevels.u, currLevel:audioLevels.c, horizontal:false, rounded:false, height: R.h-10, timeout:0.5, propagateDrag:true, colorFG:colorFG}
    );

    let ebLast = 0; // Used for fix/Hack needed because there is a timeout before the slider is called upon.
    Bangle.setUI({
      mode : "custom",
      touch : touchHandler,
      swipe : swipeHandler,
      remove : ()=>{
        progressBar.v.shouldAutoDraw = false;
        Bangle.removeListener('message', messageHandler);
        Bangle.removeListener('audio', audioHandler);
        if (volumeSlider) {
          volumeSlider.f.remove();
        }
        if (progressBar) {
          progressBar.f.stopAutoUpdate();
          //progressBar.f.remove();
        }
        clearWatch(buttonHandler);
        widgetUtils.show();
      }
    });
    let buttonHandler = setWatch(()=>{load();}, BTN, {edge:'falling'});
  };

  // Get back to the main layout
  let backToGfx = function() {
    E.showMenu();
    g.clear();
    g.reset();
    gfx();
    setUI();
    progressBar.v.shouldAutoDraw = true;
    print("proglevel: ", progressBar.v.level)
    progressBar.f.draw(progressBar.v.level);
    backToMenu = false;
  };

  ////////
  //The functions for interacting with Android and the Spotify app
  ////////

  let createCommand = function(o) {
    return ()=>{
      Bluetooth.println("");
      Bluetooth.println(JSON.stringify(o));
    };
  };

  let assembleSearchString = function() {
    return (artist=="" ? "":("artist:\""+artist+"\"")) + ((artist!="" && track!="") ? " ":"") + (track=="" ? "":("track:\""+track+"\"")) + (((artist!="" && album!="") || (track!="" && album!="")) ? " ":"") + (album=="" ? "":(" album:\""+album+"\""));
  };

  simpleSearch = "";
  let simpleSearchTerm = function() { // input a simple search term without tags, overrides search with tags (artist and track)
    require("textinput").input({text:simpleSearch}).then(result => {simpleSearch = result;}).then(() => {E.showMenu(searchMenu);});
  };

  artist = "";
  let artistSearchTerm = function() { // input artist to search for
    require("textinput").input({text:artist}).then(result => {artist = result;}).then(() => {E.showMenu(searchMenu);});
  };

  track = "";
  let trackSearchTerm = function() { // input track to search for
    require("textinput").input({text:track}).then(result => {track = result;}).then(() => {E.showMenu(searchMenu);});
  };

  album = "";
  let albumSearchTerm = function() { // input album to search for
    require("textinput").input({text:album}).then(result => {album = result;}).then(() => {E.showMenu(searchMenu);});
  };

  let searchPlayWOTags = createCommand({t:"intent", action:"android.media.action.MEDIA_PLAY_FROM_SEARCH", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", target:"activity", extra:{query:simpleSearch}, flags:["FLAG_ACTIVITY_NEW_TASK"]});

  let searchPlayWTags = createCommand({t:"intent", action:"android.media.action.MEDIA_PLAY_FROM_SEARCH", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", target:"activity", extra:{query:assembleSearchString()}, flags:["FLAG_ACTIVITY_NEW_TASK"]});

  let playVreden = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:track:5QEFFJ5tAeRlVquCUNpAJY:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"]});

  let playVredenAlternate = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:track:5QEFFJ5tAeRlVquCUNpAJY:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK"]});

  let searchPlayVreden = createCommand({t:"intent", action:"android.media.action.MEDIA_PLAY_FROM_SEARCH", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", target:"activity", extra:{query:'artist:"Sara Parkman" track:"Vreden"'}, flags:["FLAG_ACTIVITY_NEW_TASK"]});

  let openAlbum = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:album:3MVb2CWB36x7VwYo5sZmf2", target:"activity", flags:["FLAG_ACTIVITY_NEW_TASK"]});

  let searchPlayAlbum = createCommand({t:"intent", action:"android.media.action.MEDIA_PLAY_FROM_SEARCH", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", target:"activity", extra:{query:'album:"The blue room" artist:"Coldplay"', "android.intent.extra.focus":"vnd.android.cursor.item/album"}, flags:["FLAG_ACTIVITY_NEW_TASK"]});

  let spotifyWidget = function(action) {
    Bluetooth.println("");
    Bluetooth.println(JSON.stringify({t:"intent", action:("com.spotify.mobile.android.ui.widget."+action), package:"com.spotify.music", target:"broadcastreceiver"}));
  };

  let gadgetbridgeWake = createCommand({t:"intent", target:"activity", flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_CLEAR_TASK", "FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS", "FLAG_ACTIVITY_NO_ANIMATION"], package:"gadgetbridge", class:"nodomain.freeyourgadget.gadgetbridge.activities.WakeActivity"});

  let spotifyPlaylistDW = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:user:spotify:playlist:37i9dQZEVXcRfaeEbxXIgb:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"/*,  "FLAG_ACTIVITY_CLEAR_TOP", "FLAG_ACTIVITY_PREVIOUS_IS_TOP"*/]});

  let spotifyPlaylistDM1 = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:user:spotify:playlist:37i9dQZF1E365VyzxE0mxF:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"/*,  "FLAG_ACTIVITY_CLEAR_TOP", "FLAG_ACTIVITY_PREVIOUS_IS_TOP"*/]});

  let spotifyPlaylistDM2 = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:user:spotify:playlist:37i9dQZF1E38LZHLFnrM61:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"/*,  "FLAG_ACTIVITY_CLEAR_TOP", "FLAG_ACTIVITY_PREVIOUS_IS_TOP"*/]});

  let spotifyPlaylistDM3 = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:user:spotify:playlist:37i9dQZF1E36RU87qzgBFP:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"/*,  "FLAG_ACTIVITY_CLEAR_TOP", "FLAG_ACTIVITY_PREVIOUS_IS_TOP"*/]});

  let spotifyPlaylistDM4 = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:user:spotify:playlist:37i9dQZF1E396gGyCXEBFh:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"/*,  "FLAG_ACTIVITY_CLEAR_TOP", "FLAG_ACTIVITY_PREVIOUS_IS_TOP"*/]});

  let spotifyPlaylistDM5 = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:user:spotify:playlist:37i9dQZF1E37a0Tt6CKJLP:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"/*,  "FLAG_ACTIVITY_CLEAR_TOP", "FLAG_ACTIVITY_PREVIOUS_IS_TOP"*/]});

  let spotifyPlaylistDM6 = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:user:spotify:playlist:37i9dQZF1E36UIQLQK79od:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"/*,  "FLAG_ACTIVITY_CLEAR_TOP", "FLAG_ACTIVITY_PREVIOUS_IS_TOP"*/]});

  let spotifyPlaylistDD = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:user:spotify:playlist:37i9dQZF1EfWFiI7QfIAKq:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"/*,  "FLAG_ACTIVITY_CLEAR_TOP", "FLAG_ACTIVITY_PREVIOUS_IS_TOP"*/]});

  let spotifyPlaylistRR = createCommand({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:user:spotify:playlist:37i9dQZEVXbs0XkE2V8sMO:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"/*,  "FLAG_ACTIVITY_CLEAR_TOP", "FLAG_ACTIVITY_PREVIOUS_IS_TOP"*/]});

  // Spotify Remote Menu
  let spotifyMenu = {
    "" : { title : " Menu ",
      back: backToGfx },
    "Controls" : ()=>{E.showMenu(controlMenu);},
    "Search and play" : ()=>{E.showMenu(searchMenu);},
    "Saved music" : ()=>{E.showMenu(savedMenu);},
    "Wake the android" : function() {gadgetbridgeWake();gadgetbridgeWake();},
    "Exit Spotify Remote" : ()=>{progressBar.f.stopAutoUpdate(); load();}
  };

  let menuBackFunc = ()=>{
    if (backToMenu) E.showMenu(spotifyMenu);
    if (!backToMenu) backToGfx();
  };

  let controlMenu = {
    "" : { title : " Controls ",
      back: menuBackFunc },
    "Play" : ()=>{Bangle.musicControl("play");},
    "Pause" : ()=>{Bangle.musicControl("pause");},
    "Previous" : ()=>{spotifyWidget("PREVIOUS");},
    "Next" : ()=>{spotifyWidget("NEXT");},
    "Play (widget, next then previous)" : ()=>{spotifyWidget("NEXT"); spotifyWidget("PREVIOUS");},
    "Messages Music Controls" : ()=>{load("messagesmusic.app.js");},
  };

  let searchMenu = {
    "" : { title : " Search ",
      back: menuBackFunc },
    "Search term w/o tags" : simpleSearchTerm,
    "Execute search and play w/o tags" : searchPlayWOTags,
    "Search term w tag \"artist\"" : artistSearchTerm,
    "Search term w tag \"track\"" : trackSearchTerm,
    "Search term w tag \"album\"" : albumSearchTerm,
    "Execute search and play with tags" : searchPlayWTags,
  };

  let savedMenu = {
    "" : { title : " Saved ",
      back: menuBackFunc },
    "Play Discover Weekly" : spotifyPlaylistDW,
    "Play Daily Mix 1" : spotifyPlaylistDM1,
    "Play Daily Mix 2" : spotifyPlaylistDM2,
    "Play Daily Mix 3" : spotifyPlaylistDM3,
    "Play Daily Mix 4" : spotifyPlaylistDM4,
    "Play Daily Mix 5" : spotifyPlaylistDM5,
    "Play Daily Mix 6" : spotifyPlaylistDM6,
    "Play Daily Drive" : spotifyPlaylistDD,
    "Play Release Radar" : spotifyPlaylistRR,
    "Play \"Vreden\" by Sara Parkman via uri-link" : playVreden,
    "Open \"The Blue Room\" EP (no autoplay)" : openAlbum,
    "Play \"The Blue Room\" EP via search&play" : searchPlayAlbum,
  };

  Bangle.loadWidgets();
  initProgressBar(true);
  gfx();
  setUI();
}
