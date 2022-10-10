Bangle.loadWidgets();

keepOn = false;

function setUI() { Bangle.setUI({
  mode : "custom",
  back : load,
  touch : function(n,e) {
    if (keepOn == false) {
      Bangle.setLCDTimeout(0);
      Bangle.setLCDPower(1);
      keepOn = !keepOn;
    } else {
      Bangle.setLCDTimeout(10);
      Bangle.setLCDPower(0);
      keepOn = !keepOn;
    }
  }, // optional - handler for 'touch' events
  drag : function(e) {
    counter = counter+e.dx/20<0 ? 0: Math.round(counter+e.dx/20);
    
    wordsPerSecond = wordsPerSecond-e.dy/40;
    wordsPerSecond = wordsPerSecond<0.0001 ? 0.0001 : wordsPerSecond;
    wordsPerSecond = wordsPerSecond>60 ? 60 : wordsPerSecond;
    


    if (e.b ==0) {
      //clearInterval(printInterval);
      clearInterval(countInterval);
      //printInterval = setInterval(printWord, 1000/wordsPerSecond, e.b);
      countInterval = setInterval(count, 1000/wordsPerSecond);
    }

    // Print word# and wpm:
    g.clearRect(R.x, R.y+R.h/2-8-25, R.x2, R.y+R.h/2+8-25);
    g.clearRect(R.x, R.y+R.h/2-8+25, R.x2, R.y+R.h/2+8+25);
    info = "word# " + counter + "\n\n\n" + wordsPerSecond + " wps";
    setGfx();
    g.drawString(info, Bangle.appRect.x2/2, Bangle.appRect.y+Bangle.appRect.h/2);
    if (e.b == 0) {
      g.clearRect(R.x, R.y+R.h/2-8-25, R.x2, R.y+R.h/2+8-25);
      g.clearRect(R.x, R.y+R.h/2-8+25, R.x2, R.y+R.h/2+8+25);
    }

    // Print the word:
    //g.clearRect(R.x, R.y+R.h/2-8, R.x2, R.y+R.h/2+8);
    //g.drawString(words[counter], Bangle.appRect.x2/2, Bangle.appRect.y+Bangle.appRect.h/2);
    
    //console.log(wordsPerSecond, counter, e.b);
  }
});
}

sentences = "Wuthering Heights  by Emily Brontë     CHAPTER I   1801 - I have just returned from a visit to my landlord - the solitary neighbour that I shall be troubled with. This is certainly a beautiful country! In all England, I do not believe that I could have fixed on a situation so completely removed from the stir of society. A perfect misanthropist's Heaven - and Mr. Heathcliff and I are such a suitable pair to divide the desolation between us. A capital fellow! He little imagined how my heart warmed towards him when I beheld his black eyes withdraw so suspiciously under their brows, as I rode up, and when his fingers sheltered themselves, with a jealous resolution, still further in his waistcoat, as I announced my name. \"Mr. Heathcliff? \" I said. A nod was the answer. \"Mr. Lockwood, your new tenant, sir. I do myself the honour of calling as soon as possible after my arrival, to express the hope that I have not inconvenienced you by my perseverance in soliciting the occupation of Thrushcross Grange: I heard yesterday you had had some thoughts - \"  \"Thrushcross Grange is my own, sir, \" he interrupted, wincing. \"I should not allow any one to inconvenience me, if I could hinder it - walk in! \"  The \"walk in\" was uttered with closed teeth, and expressed the sentiment, \"Go to the Deuce! \" even the gate over which he leant manifested no sympathising movement to the words; and I think that circumstance determined me to accept the invitation: I felt interested in a man who seemed more exaggeratedly reserved than myself. When he saw my horse's breast fairly pushing the barrier, he did put out his hand to unchain it, and then sullenly preceded me up the causeway, calling, as we entered the court, - \"Joseph, take Mr. Lockwood's horse; and bring up some wine. \"  \"Here we have the whole establishment of domestics, I suppose, \" was the reflection suggested by this compound order. \"No wonder the grass grows up between the flags, and cattle are the only hedge - cutters. \"  Joseph was an elderly, nay, an old man, very old, perhaps, though hale and sinewy. \"The Lord help us! \" he soliloquised in an undertone of peevish displeasure, while relieving me of my horse: looking, meantime, in my face so sourly that I charitably conjectured he must have need of divine aid to digest his dinner, and his pious ejaculation had no reference to my unexpected advent. Wuthering Heights is the name of Mr. Heathcliff's dwelling. \"Wuthering\" being a significant provincial adjective, descriptive of the atmospheric tumult to which its station is exposed in stormy weather. Pure, bracing ventilation they must have up there at all times, indeed: one may guess the power of the north wind, blowing over the edge, by the excessive slant of a few stunted firs at the end of the house; and by a range of gaunt thorns all stretching their limbs one way, as if craving alms of the sun. Happily, the architect had foresight to build it strong: the narrow windows are deeply set in the wall, and the corners defended with large jutting stones. Before passing the threshold, I paused to admire a quantity of grotesque carving lavished over the front, and especially about the principal door; above which, among a wilderness of crumbling griffins and shameless little boys, I detected the date \"1500, \" and the name \"Hareton Earnshaw. \" ";

wordsPerSecond = 1;
var wordsPerSecondSubt;
words = sentences.split(" ");

R = Bangle.appRect;

function setGfx() {
  g.setColor(g.theme.fg);
  g.setFont("6x8",2);
  g.setFontAlign(0,0,0);
}

function endOfSentence(ebIn) {
  clearInterval(printInterval);
  g.clearRect(Bangle.appRect);
  counter = 0;
  printInterval = setInterval(printWord, 1000/wordsPerSecond, ebIn);
}



function printWord(ebIn) {
  if (counter > words.length-1) endOfSentence(ebIn);
  g.clearRect(R.x, R.y+R.h/2-8, R.x2, R.y+R.h/2+8);
  setGfx();
  g.drawString(words[counter], Bangle.appRect.x2/2, Bangle.appRect.y+Bangle.appRect.h/2);
  //console.log(wordsPerSecond, counter, ebIn);
}

function count() {
  wordsPerSecondSubt = 0.05 * wordsPerSecond * (Math.max(0, (words[counter].length-3)));
  //console.log(wordsPerSecond, wordsPerSecondSubt);
  clearInterval(printInterval);
  printInterval = setInterval(printWord, 1000/(wordsPerSecond-wordsPerSecondSubt), ebSubstitute); 
  clearInterval(countInterval);
  countInterval = setInterval(count, 1000/(wordsPerSecond-wordsPerSecondSubt));
  counter++;
  if (counter > words.length) endOfSentence();
}

var counter = 0;

function startUp() {
  ebSubstitute=0;
  g.clearRect(R);
  setGfx();
  printInterval = setInterval(printWord, 1000/wordsPerSecond, ebSubstitute);
  countInterval = setInterval(count, 1000/wordsPerSecond);
}


require("textinput").input({text:"enter word#: "}).then(result => {counter = !parseInt(result.slice(13))?0:parseInt(result.slice(13));}).then(setUI).then(startUp);
