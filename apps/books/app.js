/*
Todo
- [DONE] remove last entry in words array (It's often a incomplete word b/c of how book.txt is read with require)
  - [Done] read the size in bytes of the string removed and consider it when reading the next section of book.txt
-implement scrolling back and forth seemlessly between sections of book.txt. [started]
- is it better to store the book as a json array than a .txt file? What does that mean for file size?
- should I have a count of number of words handy in a help file? I think this would help with scrolling back and forth in the text.
*/


Bangle.loadWidgets();

keepOn = false;

function setUI() { Bangle.setUI({
  mode : "custom",
  back : load,
  touch : function(n,e) {
    // Toggle keep screen on. Needs changes.
    if (keepOn == false) {
      Bangle.setLCDTimeout(0);
      Bangle.setLCDPower(1);
      keepOn = !keepOn;
    } else {
      Bangle.setLCDTimeout(10);
      Bangle.setLCDPower(0);
      keepOn = !keepOn;
    }
  },
  drag : function(e) {
    counter = counter+e.dx/20 < 0 ? 0: Math.round(counter+e.dx/20); // Update counter to move back and forth in the text.
    // Todo: If counter <= 0 updateWords to the last section of book.txt, and vice versa if scrolling beyond the words currently stored in 'words'.
    if (counter == 0) {
      words = updateWords(accumulatedLength - targetLength);
      counter = words.length-1 + Math.round(counter+e.dx/20);
    }
    //counter = counter > words.length ? words.length : counter;
    
    wordsPerSecond = wordsPerSecond-e.dy/40; // Change reading speed.
    wordsPerSecond = wordsPerSecond<0.0001 ? 0.0001 : wordsPerSecond; // Don't be negative while reading.
    wordsPerSecond = wordsPerSecond>60 ? 60 : wordsPerSecond; // The screen doesn't believe you can read at more than 60 words per second. I don't doubt that you could though!
    

    // Keep at it when not draging anymore.
    if (e.b ==0) {
      //clearInterval(printInterval);
      clearInterval(countInterval);
      //printInterval = setInterval(printWord, 1000/wordsPerSecond, e.b);
      countInterval = setInterval(count, 1000/wordsPerSecond);
    }

    // Print word# and wps:
    g.clearRect(R.x, R.y+R.h/2-8-25, R.x2, R.y+R.h/2+8-25);
    g.clearRect(R.x, R.y+R.h/2-8+25, R.x2, R.y+R.h/2+8+25);
    info = "word# " + counter + "\n\n\n" + wordsPerSecond + " wps";
    setGfx();
    g.drawString(info, Bangle.appRect.x2/2, Bangle.appRect.y+Bangle.appRect.h/2);
    
    // Clear word# and wps when not draging anymore.
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

targetLength = 40; // in bytes, 1 byte per character ???
let actualLength;
let accumulatedLength = 0;
let accumulatedWords = 0;
section = 0;
function updateWords(startPoint) {
  if (startPoint >= 0) {
    sentences = require("Storage").read("book.txt", startPoint, targetLength);
  } else {
    sentences = require("Storage").read("book.txt", 0, targetLength+startPoint);
  }
  words = sentences.split(" ");
  print(words);
  // remove the last/first word from words, it's probably incomplete.
  if (startPoint >= accumulatedLength) {
    removed = words.pop();
    bytesOfRemoved = removed.length; //*2; // https://stackoverflow.com/a/46735247 ????
    // remove that size in bytes from length variable
    actualLength = targetLength - (bytesOfRemoved);
    accumulatedLength += actualLength;
  } else if (startPoint < accumulatedLength) {
    removed = words.shift();
    bytesOfRemoved = removed.length; //*2; // https://stackoverflow.com/a/46735247 ????
    // remove that size in bytes from length variable
    actualLength = targetLength - (bytesOfRemoved);
    accumulatedLength -= actualLength;
    accumulatedWords += words.length;
  }
  //print(words);
  return words;
}

wordsPerSecond = 1;
var wordsPerSecondSubt;
words = updateWords(accumulatedLength);

R = Bangle.appRect;

function setGfx() {
  g.setColor(g.theme.fg);
  g.setFont("6x8",2);
  g.setFontAlign(0,0,0);
}

function endOfSentence(ebIn) {
  clearInterval(printInterval);
  g.clearRect(Bangle.appRect);
  section++;
  words = updateWords(accumulatedLength);
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
  wordsPerSecondSubt = 0.05 * wordsPerSecond * (Math.max(0, (words[counter].length-3))); // Used to make longer words stay on screen a little longer.
  //console.log(wordsPerSecond, wordsPerSecondSubt);
  
  // Update counting and printing intervals.
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

// Entry point: First use keyboard to ask where to start reading, then update setUI and start reading.
//require("textinput").input({text:"enter word#: "}).then(result => {counter = !parseInt(result.slice(13))?0:parseInt(result.slice(13));}).then(setUI).then(startUp);
setUI();
startUp();
