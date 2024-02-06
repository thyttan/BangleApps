// TODO:
// - Add /*LANG*/ tags for translations.
// - 

{
  const storage = require("Storage");
  let appData = storage.readJSON("worklog.json", true) || {
    currentTask : "default",
    tasks : {
      default: {
        file : "worklog_default.csv", // Existing default task log file
        state : "stopped",
        lineNumber : 0,
        lastLine : "",
        lastSyncedLine : "",
      },
      // Add more tasks as needed
    },
  };
  let currentTask = appData.currentTask;
  let tasks = appData.tasks;
  delete appData;

  // Function to get the current theme colors
  let getThemeColors = ()=>{
    var theme = g.theme;
    return {
      fg: theme.fg, // Foreground color
      bg: theme.bg, // Background color
      fg2: theme.fg2 // Typically used for outlines or text
    };
  };

  // Function to draw the Start/Stop button with play and pause icons
  let drawButton = ()=>{
    var themeColors = getThemeColors();
    var btnWidth = g.getWidth() - 40;
    var btnHeight = 50;
    var btnX = 20;
    var btnY = (g.getHeight() - btnHeight) / 2;
    var cornerRadius = 25;

    var isStopped = tasks[currentTask].state === "stopped";
    g.setColor(isStopped ? "#0F0" : "#F00"); // Set color to green when stopped and red when started

    // Draw rounded corners of the button
    g.fillCircle(btnX + cornerRadius, btnY + cornerRadius, cornerRadius);
    g.fillCircle(btnX + btnWidth - cornerRadius, btnY + cornerRadius, cornerRadius);
    g.fillCircle(btnX + cornerRadius, btnY + btnHeight - cornerRadius, cornerRadius);
    g.fillCircle(btnX + btnWidth - cornerRadius, btnY + btnHeight - cornerRadius, cornerRadius);

    // Draw rectangles to fill in the button
    g.fillRect(btnX + cornerRadius, btnY, btnX + btnWidth - cornerRadius, btnY + btnHeight);
    g.fillRect(btnX, btnY + cornerRadius, btnX + btnWidth, btnY + btnHeight - cornerRadius);

    g.setColor(themeColors.bg); // Set icon color to contrast against the button's color

    // Center the icon within the button
    var iconX = btnX + btnWidth / 2;
    var iconY = btnY + btnHeight / 2;

    if (isStopped) {
      // Draw play icon
      var playSize = 10; // Side length of the play triangle
      var offset = playSize / Math.sqrt(3) - 3; // Larger vertical offset to move triangle higher
      g.fillPoly([
        iconX - playSize, iconY - playSize + offset,
        iconX - playSize, iconY + playSize + offset,
        iconX + playSize * 2 / Math.sqrt(3), iconY + offset
      ]);
    } else {
      // Draw pause icon
      var barWidth = 5; // Width of pause bars
      var barHeight = btnHeight / 2; // Height of pause bars
      var barSpacing = 5; // Spacing between pause bars
      g.fillRect(iconX - barSpacing / 2 - barWidth, iconY - barHeight / 2, iconX - barSpacing / 2, iconY + barHeight / 2);
      g.fillRect(iconX + barSpacing / 2, iconY - barHeight / 2, iconX + barSpacing / 2 + barWidth, iconY + barHeight / 2);
    }
  };

  // Improved Function to draw a simple and centered hamburger menu button
  let drawHamburgerMenu = ()=>{
    var themeColors = getThemeColors();
    var x = g.getWidth() / 2; // Center the hamburger menu horizontally
    var y = (7/8)*g.getHeight(); // Position it near the bottom
    var lineLength = 18; // Length of the hamburger lines
    var spacing = 6; // Space between the lines

    g.setColor(themeColors.fg); // Set color to foreground color for the icon
    // Draw three horizontal lines
    for (var i = -1; i <= 1; i++) {
      g.fillRect(x - lineLength/2, y + i * spacing - 1, x + lineLength/2, y + i * spacing + 1);
    }
  };

  // Function to draw the task name centered between the widget field and the start/stop button
  let drawTaskName = ()=>{
    var themeColors = getThemeColors();

    g.setFont("Vector", 20); // Set a smaller font for the task name display
    var taskNameWidth = g.stringWidth(currentTask); // Width of the task name
    var taskNameHeight = g.getFontHeight(); // Height of the task name

    // Calculate position to center the task name horizontally
    var x = (g.getWidth()) / 2;

    // Calculate position to center the task name vertically between the widget field and the start/stop button
    var widgetFieldBottom = 24; // Adjust this value as needed for the actual widget height
    var buttonTop = (g.getHeight() - 50) / 2; // Y-coordinate of the top of the start/stop button
    var y = g.getHeight()/4; // Center vertically

    g.setColor(themeColors.fg).setFontAlign(0,0); // Set text color to foreground color
    g.drawString(currentTask, x, y); // Draw the task name centered on the screen
  };

  // Function to draw the last log entry of the current task
  let drawLastLogEntry = ()=>{
    var themeColors = getThemeColors();

    //g.setFont("6x8", 2); // Set a smaller font for the log entry display
    g.setFont("Vector", 10); // Set a smaller font for the task name display
    var logEntryWidth = g.stringWidth(tasks[currentTask].lastLine); // Width of the log entry
    var logEntryHeight = g.getFontHeight(); // Height of the log entry

    // Calculate position to center the log entry horizontally
    var x = (g.getWidth()) / 2;

    // Calculate position to place the log entry properly between the start/stop button and hamburger menu
    var btnBottomY = (g.getHeight() + 50) / 2; // Y-coordinate of the bottom of the start/stop button
    var menuBtnYTop = g.getHeight() * (5 / 6); // Y-coordinate of the top of the hamburger menu button
    var y = btnBottomY + (menuBtnYTop - btnBottomY) / 2 + 6; // Center vertically between button and menu

    g.setColor(themeColors.fg).setFontAlign(0,0); // Set text color to foreground color
    g.drawString(tasks[currentTask].lastLine, x, y); // Draw the log entry centered on the screen
  };

  // Helper function to read the last log entry from the current task's log file
  let updateLastLogEntry = ()=>{
    var filename = tasks[currentTask].file;
    var file = require("Storage").open(filename, "r");
    var lastLine = "";
    var line;
    while ((line = file.readLine()) !== undefined) {
      lastLine = line; // Keep reading until the last line
    }
    tasks[currentTask].lastLine = lastLine;
  };

  // Main UI drawing function
  let drawMainMenu = ()=>{
    var themeColors = getThemeColors();
    g.clear();
    Bangle.drawWidgets(); // Draw any active widgets
    g.setColor(themeColors.bg); // Set color to theme's background color
    g.fillRect(Bangle.appRect); // Fill the app area with the background color

    drawTaskName(); // Draw the centered task name
    drawLastLogEntry(); // Draw the last log entry of the current task
    drawButton(); // Draw the Start/Stop toggle button
    drawHamburgerMenu(); // Draw the hamburger menu button icon

    g.flip(); // Send graphics to the display
  };

  // Function to toggle the work log state
  let toggleWorkLog = ()=>{
    var currentTime = new Date().toISOString();
    currentTime = currentTime.substring(0,currentTime.length-5);
    tasks[currentTask].lineNumber = Number(tasks[currentTask].lineNumber) + 1;
    logEntry = tasks[currentTask].lineNumber + (tasks[currentTask].state === "stopped" ? ",Start," : ",Stop,") + currentTime + "\n";
    var filename = tasks[currentTask].file;

    // Open the appropriate file and append the log entry
    var file = require("Storage").open(filename, "a");
    file.write(logEntry);
    tasks[currentTask].lastLine = logEntry;

    // Toggle the state and update the button text
    tasks[currentTask].state = tasks[currentTask].state === "stopped" ? "started" : "stopped";
    drawMainMenu(); // Redraw the main UI
  };

  // Define the touch handler function for the main menu
  let handleMainMenuTouch = (button, xy)=>{
    var btnTopY = (g.getHeight() - 50) / 2;
    var btnBottomY = btnTopY + 50;
    var menuBtnYTop = (7/8)*g.getHeight() - 15;
    var menuBtnYBottom = (7/8)*g.getHeight() + 15;
    var menuBtnXLeft = (g.getWidth() / 2) - 15;
    var menuBtnXRight = (g.getWidth() / 2) + 15;

    // Detect if the touch is within the toggle button area
    if (xy.x >= 20 && xy.x <= (g.getWidth() - 20) && xy.y > btnTopY && xy.y < btnBottomY) {
      toggleWorkLog();
    }
    // Detect if the touch is within the hamburger menu button area
    else if (xy.x >= menuBtnXLeft && xy.x <= menuBtnXRight && xy.y >= menuBtnYTop && xy.y <= menuBtnYBottom) {
      showMenu();
    }
  };

  // Function to attach the touch event listener
  let setMainUI = ()=>{
    Bangle.setUI({
      mode: "custom",
      back: load,
      touch: handleMainMenuTouch
    });
  };

  let saveAppState = ()=>{
    let appData = {
      currentTask : currentTask,
      tasks : tasks,
    };
    require("Storage").writeJSON("worklog.json", appData);
  };
  // Set up a listener for the 'kill' event
  E.on('kill', saveAppState);

  // Function to switch to a selected task
  let switchTask = (taskName)=>{
    currentTask = taskName; // Update the current task

    // Reinitialize the UI elements
    //Bangle.removeAllListeners("touch");
    setMainUI();
    drawMainMenu(); // Redraw UI to reflect the task change and the button state
  };

  // Function to create a new task
  let createNewTask = ()=>{
    // Prompt the user to input the task's name
    require("textinput").input({
      title: "New Task",
      text: "" // Default empty text for new task
    }).then(result => {
        var taskName = result; // Store the result from text input
        if (taskName) {
          if (tasks.hasOwnProperty(taskName)) {
            // Task already exists, handle this case as needed
            E.showAlert("Task already exists", "Error").then(drawMainMenu);
          } else {
            // Create a new task log file for the new task
            var filename = "worklog_" + taskName.replace(/\W+/g, "_") + ".csv";
            tasks[taskName] = {
              file : filename,
              state : "stopped",
              lineNumber : 0,
              lastLine : "",
              lastSyncedLine : "",
            };

            // Open the new file to initialize it (optional)
            //require("Storage").open(filename, "w").write("");

            currentTask = taskName;

            setMainUI();
            drawMainMenu(); // Redraw UI with the new task
          }
        } else {
          setMainUI();
          drawMainMenu(); // User cancelled, redraw main menu
        }
      }).catch(e => {
        console.log("Text input error", e);
        drawMainMenu(); // In case of error also redraw main menu
      });
  };

  // Function to display the list of tasks for selection
  let chooseTask = ()=>{
    // Construct the tasks menu from the tasks object
    var taskMenu = {
      "": { "title": "Choose Task",
        "back" : function() {
          //Bangle.removeAllListeners("touch");
          setMainUI(); // Reattach when the menu is exited
          drawMainMenu(); // Cancel task selection
        }
      }
    };
    for (var taskName in tasks) {
      if (!tasks.hasOwnProperty(taskName)) continue;
      taskMenu[taskName] = (function(name) {
        return function() {
          switchTask(name);
        };
      })(taskName);
    }

    // Add a menu option for creating a new task
    taskMenu["Create New Task"] = createNewTask;

    E.showMenu(taskMenu); // Display the task selection
  };

  // Function to annotate the current or last work session
  let annotateTask = ()=>{
    var filename = tasks[currentTask].file;
    var file = require("Storage").open(filename, "r");
    tasks[currentTask].lineNumber ++;

    // Prompt the user to input the annotation text
    require("textinput").input({
      text: "" // Default empty text for annotation
    }).then(result => {
        var annotationText = result.trim();
        if (annotationText) {
          // Append annotation to the last or current log entry
          var annotatedEntry = tasks[currentTask].lineNumber + ",Note: " + annotationText + "\n";
          var file = require("Storage").open(filename, "a");
          file.write(annotatedEntry);
          tasks[currentTask].lastLine = annotatedEntry;
          setMainUI();
          drawMainMenu(); // Redraw UI after adding the annotation
        } else {
          // User cancelled, so we do nothing and just redraw the main menu
          setMainUI();
          drawMainMenu();
        }
      }).catch(e => {
        console.log("Annotation input error", e);
        setMainUI();
        drawMainMenu(); // In case of error also redraw main menu
      });
  };

  let syncToAndroid = (taskName, isFullSync)=>{
    // TODO:
    // - Use lastSyncedLine info to optimize bt transfer.
    // - Have option to sync only unsynced lines as well as complete resync of whole log.
    // - Have option to sync just the currentTask as well as to sync all logs?

    let mode = "a";
    if (isFullSync) mode = "w";
    let lastSyncedLine = tasks[taskName].lastSyncedLine || 0;

    let storageFile = require("Storage").open("worklog_"+taskName+".csv", "r");
    let contents = storageFile.readLine();
    let lineNumber = contents ? contents.slice(0, contents.indexOf(",")) : 0;
    let shouldSyncLine = ()=>{return (contents && (isFullSync || (!isFullSync&&lineNumber>lastSyncedLine)));};
    let doSyncLine = (mde)=>{Bluetooth.println(JSON.stringify({t:"file", n:"worklog_"+taskName+".csv", c:contents, m:mde}));};
    if (shouldSyncLine()) doSyncLine(mode);
    contents = storageFile.readLine();
    while (contents) {
      lineNumber = contents.slice(0, contents.indexOf(",")); //lineNumber++
      if (shouldSyncLine()) doSyncLine("a");
      contents = storageFile.readLine();
    }
    tasks[taskName].lastSyncedLine = lineNumber;
  };

  // Update the showMenu function to include "Change Task" option
  let showMenu = ()=>{
    var menu = {
      "": { "title": "Menu",
        "back": function() {
          //Bangle.removeAllListeners("touch");
          setMainUI(); // Reattach when the menu is exited
          drawMainMenu(); // Redraw the main UI when exiting the menu
        },
      },
      "Annotate": annotateTask, // Now calls the real annotation function
      "Change Task": chooseTask, // Opens the task selection screen
      "Sync to Android": ()=>syncToAndroid(currentTask,false),
    };
    E.showMenu(menu);
  };

  Bangle.loadWidgets();
  drawMainMenu(); // Draw the main UI when the app starts
  // When the application starts, attach the touch event listener
  setMainUI();
}
