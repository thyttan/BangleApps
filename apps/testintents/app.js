
/* App for testing PR to Gadgetbridge extending intents functionality, here: https://codeberg.org/Freeyourgadget/Gadgetbridge/pulls/2769'
Can be extended upon request, or by yourself.

Bangle.js Gadgetbridge now supports starting activities in addition to sending broadcasts. Targeting services is yet to be implemented.
action, category, mimetype, data, extra, package, class and target information can now be supplied to intents 
(these are also the corresponding keys to use when programming intent messages to send to gadgetbridge).
Values to pass to target are "", "broadcastreceiver", "activity", "service" or target can be left out.

Template for initiating an intent through javascript-code from a Bangle.js app that sends message to Gadgetbridge:

Bluetooth.println(JSON.stringify({t:"intent", action:"", flags:["flag1", "flag2",...], categories:["category1","category2",...], mimetype:"", data:"",  package:"", class:"", target:"", extra:{someKey:"someValueOrString"}}));

Key/value-pairs in the template can be omitted if not applicable in a specific case.
*/

simpleSearch = "";
function simpleSearchTerm() { // input a simple search term without tags, overrides search with tags (artist and track)
  require("textinput").input({text:simpleSearch}).then(result => {simpleSearch = result;}).then(() => {E.showMenu(spotifyMenu);});
}

artist = "";
function artistSearchTerm() { // input artist to search for
  require("textinput").input({text:artist}).then(result => {artist = result;}).then(() => {E.showMenu(spotifyMenu);});
}

track = "";
function trackSearchTerm() { // input track to search for
  require("textinput").input({text:track}).then(result => {track = result;}).then(() => {E.showMenu(spotifyMenu);});
}

album = "";
function albumSearchTerm() { // input album to search for
  require("textinput").input({text:album}).then(result => {album = result;}).then(() => {E.showMenu(spotifyMenu);});
}

function searchPlayWOTags() {//make a spotify search and play using entered terms
  searchString = simpleSearch;
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.media.action.MEDIA_PLAY_FROM_SEARCH", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", target:"activity", extra:{"query":searchString}, flags:["FLAG_ACTIVITY_NEW_TASK"]}));
}

function searchPlayWTags() {//make a spotify search and play using entered terms
  searchString = (artist=="" ? "":("artist:\""+artist+"\"")) + ((artist!="" && track!="") ? " ":"") + (track=="" ? "":("track:\""+track+"\"")) + (((artist!="" && album!="") || (track!="" && album!="")) ? " ":"") + (album=="" ? "":(" album:\""+album+"\""));
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.media.action.MEDIA_PLAY_FROM_SEARCH", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", target:"activity", extra:{"query":searchString}, flags:["FLAG_ACTIVITY_NEW_TASK"]}));
}

function playVreden() {//Play the track "Vreden" by Sara Parkman via spotify uri-link
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:track:5QEFFJ5tAeRlVquCUNpAJY:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"/*,  "FLAG_ACTIVITY_CLEAR_TOP", "FLAG_ACTIVITY_PREVIOUS_IS_TOP"*/]}));
}

function playVredenAlternate() {//Play the track "Vreden" by Sara Parkman via spotify uri-link
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:track:5QEFFJ5tAeRlVquCUNpAJY:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK"]}));
}

function searchPlayVreden() {//Play the track "Vreden" by Sara Parkman via search and play
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.media.action.MEDIA_PLAY_FROM_SEARCH", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", target:"activity", extra:{"query":'artist:"Sara Parkman" track:"Vreden"'}, flags:["FLAG_ACTIVITY_NEW_TASK"]}));
}

function openAlbum() {//Play EP "The Blue Room" by Coldplay
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:album:3MVb2CWB36x7VwYo5sZmf2", target:"activity", flags:["FLAG_ACTIVITY_NEW_TASK"]}));
}

function searchPlayAlbum() {//Play EP "The Blue Room" by Coldplay via search and play
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.media.action.MEDIA_PLAY_FROM_SEARCH", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", target:"activity", extra:{"query":'album:"The blue room" artist:"Coldplay"', "android.intent.extra.focus":"vnd.android.cursor.item/album"}, flags:["FLAG_ACTIVITY_NEW_TASK"]}));
}

function spotifyWidget(action) {
  Bluetooth.println(JSON.stringify({t:"intent", action:("com.spotify.mobile.android.ui.widget."+action), package:"com.spotify.music", target:"broadcastreceiver"}));
}

function simpleSearchTermGeneral() { // input a simple search term without tags, overrides search with tags (artist and track)
  require("textinput").input({text:simpleSearch}).then(result => {simpleSearch = result;}).then(() => {E.showMenu(mediaMenu);});
}

function searchPlayGeneral() {
  searchString = simpleSearch;
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.media.action.MEDIA_PLAY_FROM_SEARCH", categories:["android.intent.category.DEFAULT"], target:"activity", extra:{"query":searchString}, flags:["FLAG_ACTIVITY_NEW_TASK"]}));
}

function searchPlayHelloWorld() {
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.media.action.MEDIA_PLAY_FROM_SEARCH", categories:["android.intent.category.DEFAULT"], target:"activity", extra:{query:'track:"Sittin\' on the Dock of the Bay" artist:"Otis Redding"'}, flags:["FLAG_ACTIVITY_NEW_TASK"]}));
}

function sendIntentFlag() {
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:track:5QEFFJ5tAeRlVquCUNpAJY:play", target:"activity", flags:["FLAG_ACTIVITY_NEW_TASK"]}));
}

function sendIntentFlags() {
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:track:5QEFFJ5tAeRlVquCUNpAJY:play", target:"activity", flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_SINGLE_TOP"]}));
}

function gadgetbridgeWake() {
  Bluetooth.println(JSON.stringify({t:"intent", target:"activity", flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_CLEAR_TASK", "FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS", "FLAG_ACTIVITY_NO_ANIMATION"], package:"gadgetbridge", class:"nodomain.freeyourgadget.gadgetbridge.activities.WakeActivity"}));
}

function homeButtonPress() {
  Bluetooth.println(JSON.stringify({t:"intent", target:"activity", action:"android.intent.action.MAIN", flags:["FLAG_ACTIVITY_NEW_TASK"], categories:["android.intent.category.HOME"]}));
}

function simulateBipPysicalButton() {
  Bluetooth.println(JSON.stringify({t:"intent", target:"broadcastreceiver", action:"com.junkbulk.amazfitbipbuttonmaster.A", categories:["android.intent.category.DEFAULT"]}));
}

function spotifyPlaylistDW() {
  Bluetooth.println(JSON.stringify({t:"intent", action:"android.intent.action.VIEW", categories:["android.intent.category.DEFAULT"], package:"com.spotify.music", data:"spotify:user:spotify:playlist:37i9dQZEVXcRfaeEbxXIgb:play", target:"activity" , flags:["FLAG_ACTIVITY_NEW_TASK", "FLAG_ACTIVITY_NO_ANIMATION"/*,  "FLAG_ACTIVITY_CLEAR_TOP", "FLAG_ACTIVITY_PREVIOUS_IS_TOP"*/]}));
}

function powerampPlayPauseFgService() {
  Bluetooth.println(JSON.stringify({t:"intent", target:"foregroundservice", action:"com.maxmpz.audioplayer.API_COMMAND", package:"com.maxmpz.audioplayer", extra:{cmd:"TOGGLE_PLAY_PAUSE"}}));
}

function powerampPlayPauseService() {
  Bluetooth.println(JSON.stringify({t:"intent", target:"service", action:"com.maxmpz.audioplayer.API_COMMAND", package:"com.maxmpz.audioplayer", extra:{cmd:"TOGGLE_PLAY_PAUSE"}}));
}

function powerampPlayPauseFgService2() {
  Bluetooth.println(JSON.stringify({t:"intent", target:"foregroundservice", action:"com.maxmpz.audioplayer.API_COMMAND", package:"com.maxmpz.audioplayer", extra:{cmd:1}}));
}

function powerampPlayPauseService2() {
  Bluetooth.println(JSON.stringify({t:"intent", target:"service", action:"com.maxmpz.audioplayer.API_COMMAND", package:"com.maxmpz.audioplayer", extra:{cmd:1}}));
}

// Main menu of the app
var standardMenu = {
  "" : {title : "Test intents",
        back : function() {load();}},
  "Spotify intents" : function() { E.showMenu(spotifyMenu); },
  "Media intents" : function() {E.showMenu(mediaMenu);},
  "Other intents" : function() {E.showMenu(otherMenu);},
  "Custom intent (very laborious)" : function() {E.showMenu(customMenu);},
  "Messages Music Controls" : function() {load("messagesmusic.app.js");},
};

// Submenu - spotify
var spotifyMenu = {
  "" : { title : "Spotify intents",
        back : function() { E.showMenu(standardMenu); } },
  "Search term w/o tags" : function() {simpleSearchTerm();},
  "Execute search and play w/o tags" : function() {searchPlayWOTags();},
  "Search term w tag \"artist\"" : function() {artistSearchTerm();},
  "Search term w tag \"track\"" : function() {trackSearchTerm();},
  "Search term w tag \"album\"" : function() {albumSearchTerm();},
  "Execute search and play with tags" : function() {searchPlayWTags();},
  "Play \"Vreden\" by Sara Parkman via uri-link" : function() {playVreden();},
  "Play \"Vreden\" by Sara Parkman via search&play" : function() {searchPlayVreden();},
  "Open \"The Blue Room\" EP (no autoplay)" : function() {openAlbum();},
  "Play \"The Blue Room\" EP via search&play" : function() {searchPlayAlbum();},
  "Play playlist Discover Weekly" : function() {spotifyPlaylistDW();},
  "Spotify Widget" : function() {E.showMenu(spotifyWidgetMenu);},
};

//Subsubmenu - calling spotify widget button presses
var spotifyWidgetMenu = {
  "" : { title : "Spotify widget",
       back : function() { E.showMenu(spotifyMenu); } },
  "Previous" : function() {spotifyWidget("PREVIOUS");},
  "Play (hack calling next then previous)" : function() {spotifyWidget("NEXT"); spotifyWidget("PREVIOUS");},
  "Next" : function() {spotifyWidget("NEXT");},
};

// Submenu - media
var mediaMenu = {
  "" : { title : "Media intents",
        back : function() { E.showMenu(standardMenu); } },
  "Media search term" : function() {simpleSearchTermGeneral();},
  "Execute search (and play, depending on app)" : function() {searchPlayGeneral();},
  "Hello World via search&play " : function() {searchPlayHelloWorld();},
};

var otherMenu = {
  "" : { title : "Other intents",
        back : function() { E.showMenu(standardMenu); } },
  "send intent with one flag" : function() {sendIntentFlag();},
  "send intent with two flags" : function() {sendIntentFlags();},
  "Gadgetbridge wake intent" : function() {gadgetbridgeWake();},
  "Gadgetbridge wake int x2 wake deep sleeper " : function() {gadgetbridgeWake();gadgetbridgeWake();},
  "Gadgetbridge wake and play" : function() {playVreden();gadgetbridgeWake();},
  "Simulate home button press" : function() {homeButtonPress();},
  "Broadcast: simulate Bip physical button" : function() {simulateBipPysicalButton();},
  "Poweramp service intent play/pause" : function() {powerampPlayPauseService();},
  "Poweramp service intent play/pauseFG" : function() {powerampPlayPauseFgService();},
  "Poweramp service intent play/pause2" : function() {powerampPlayPauseService2();},
  "Poweramp service intent play/pauseFG2" : function() {powerampPlayPauseFgService2();},

};


//Submenu for passing custom intents - Recommend using Multitouch keyboard app as textinput-library. Using this way to input intents is very laborious.
action = "";
category = "";
mimetype = "";
data = "";
package = "";
cls = "";
target = "";
extraKey = "";
extraValue = "";
var customMenu = {
    "" : {title : "Custom intent",
            back : function() { E.showMenu(standardMenu); } },
    "action" : function() { require("textinput").input({text:action}).then(result => {action = result;}).then(() => {E.showMenu(customMenu);});},
    "category" : function() { require("textinput").input({text:category}).then(result => {category = result;}).then(() => {E.showMenu(customMenu);});},
    "mimetype" : function() { require("textinput").input({text:mimetype}).then(result => {mimetype = result;}).then(() => {E.showMenu(customMenu);});},
    "data" : function() { require("textinput").input({text:data}).then(result => {data = result;}).then(() => {E.showMenu(customMenu);});},
    "extra" : function() { E.showMenu(extraMenu); },
    "package" : function() { require("textinput").input({text:package}).then(result => {package = result;}).then(() => {E.showMenu(customMenu);});},
    "class" : function() { require("textinput").input({text:cls}).then(result => {cls = result;}).then(() => {E.showMenu(customMenu);});},
    "target" : function() { require("textinput").input({text:target}).then(result => {target = result;}).then(() => {E.showMenu(customMenu);});},
    "send intent" : function() {
        Bluetooth.println('{t:"intent"' + (action=="" ? "":', action:"'+action+'"') + (category=="" ? "":', categories:["'+category+'"]') + (mimetype=="" ? "":', mimetype:"'+mimetype+'"') + (data=="" ? "":', data:"'+data+'"') + (package=="" ? "":', package:"'+package+'"') + (cls=="" ? "":', class:"'+cls+'"') + (target=="" ? "":', target:"'+target+'"') + (extraKey=="" ? "":(extraValue=="" ? "":', extra:{'+extraKey+':"'+extraValue+'"}'))+'}');
        },
    };

var extraMenu = {
    "" : {title : "Intent \"extra\" field",
         back : function() { E.showMenu(customMenu); } },
    "key" : function() { require("textinput").input({text:extraKey}).then(result => {extraKey = result;}).then(() => {E.showMenu(extraMenu);});},
    "value" : function() { require("textinput").input({text:extraValue}).then(result => {extraValue = result;}).then(() => {E.showMenu(extraMenu);});},
};

Bangle.loadWidgets();
Bangle.drawWidgets();
E.showMenu(standardMenu);
