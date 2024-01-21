var currentTask = "default";
var state = "stopped"; // Default to "stopped"
var tasks = {
  default: "worklog_default.csv", // Existing default task log file
  task1: "worklog_task1.csv", // Task 1 log file
  task2: "worklog_task2.csv" // Task 2 log file
  // Add more tasks as needed
};

// Function to get the current theme colors
function getThemeColors() {
  var theme = g.theme;
  return {
    fg: theme.fg, // Foreground color
    bg: theme.bg, // Background color
    fg2: theme.fg2 // Typically used for outlines or text
  };
}

// Function to draw the Start/Stop button with play and pause icons
function drawButton() {
  var themeColors = getThemeColors();
  var btnWidth = g.getWidth() - 40;
  var btnHeight = 50;
  var btnX = 20;
  var btnY = (g.getHeight() - btnHeight) / 2;
  var cornerRadius = 25;

  var isStopped = state === "stopped";
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
}

// Improved Function to draw a simple and centered hamburger menu button
function drawHamburgerMenu() {
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
}

// Function to draw the task name centered between the widget field and the start/stop button
function drawTaskName() {
  var themeColors = getThemeColors();
  var taskName = currentTask; // Name of the current task
  
  g.setFont("Vector", 20); // Set a smaller font for the task name display
  var taskNameWidth = g.stringWidth(taskName); // Width of the task name
  var taskNameHeight = g.getFontHeight(); // Height of the task name

  // Calculate position to center the task name horizontally
  var x = (g.getWidth()) / 2;
  
  // Calculate position to center the task name vertically between the widget field and the start/stop button
  var widgetFieldBottom = 24; // Adjust this value as needed for the actual widget height
  var buttonTop = (g.getHeight() - 50) / 2; // Y-coordinate of the top of the start/stop button
  var y = g.getHeight()/4; // Center vertically

  g.setColor(themeColors.fg); // Set text color to foreground color
  g.drawString(taskName, x, y); // Draw the task name centered on the screen
}

// Function to draw the last log entry of the current task
function drawLastLogEntry() {
  var themeColors = getThemeColors();
  var lastLogEntry = getLastLogEntry(); // Call a helper function to retrieve the last log entry

  //g.setFont("6x8", 2); // Set a smaller font for the log entry display
  g.setFont("Vector", 10); // Set a smaller font for the task name display
  var logEntryWidth = g.stringWidth(lastLogEntry); // Width of the log entry
  var logEntryHeight = g.getFontHeight(); // Height of the log entry

  // Calculate position to center the log entry horizontally
  var x = (g.getWidth()) / 2;
  
  // Calculate position to place the log entry properly between the start/stop button and hamburger menu
  var btnBottomY = (g.getHeight() + 50) / 2; // Y-coordinate of the bottom of the start/stop button
  var menuBtnYTop = g.getHeight() * (5 / 6); // Y-coordinate of the top of the hamburger menu button
  var y = btnBottomY + (menuBtnYTop - btnBottomY) / 2 + 6; // Center vertically between button and menu

  g.setColor(themeColors.fg); // Set text color to foreground color
  g.setFontAlign(0,0);
  g.drawString(lastLogEntry, x, y); // Draw the log entry centered on the screen
}

// Helper function to read the last log entry from the current task's log file
function getLastLogEntry() {
  var filename = tasks[currentTask];
  var file = require("Storage").open(filename, "r");
  var lastLine = "";
  var line;
  while ((line = file.readLine()) !== undefined) {
    lastLine = line; // Keep reading until the last line
  }
  return lastLine; // Return the last log entry
}

// Main UI drawing function
function drawMainMenu() {
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
}

// Function to toggle the work log state
function toggleWorkLog() {
  var currentTime = new Date().toISOString();
  var logEntry = (state === "stopped" ? "Start," : "Stop,") + currentTime + "\n";
  var filename = tasks[currentTask];

  // Open the appropriate file and append the log entry
  var file = require("Storage").open(filename, "a");
  file.write(logEntry);

  // Toggle the state and update the button text
  state = state === "stopped" ? "started" : "stopped";
  drawMainMenu(); // Redraw the main UI
}

// Define the touch handler function for the main menu
function handleMainMenuTouch(button, xy) {
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
}

// Function to attach the touch event listener
function setMainUI() {
  Bangle.setUI({
    mode: "custom",
    back: load,
    touch: handleMainMenuTouch
  });
}

function saveAppState() {
  var appData = {
    currentTask: currentTask,
    state: state,
    tasks: tasks // Save the tasks list along with the current task and state
  };
  require("Storage").writeJSON("worklog_app_state.json", appData);
}
// Set up a listener for the 'kill' event
E.on('kill', saveAppState);

// Function to switch to a selected task
function switchTask(taskName) {
  if (tasks.hasOwnProperty(taskName)) {
    currentTask = taskName; // Update the current task

    // Check the last log entry of the current task
    var filename = tasks[currentTask];
    var file = require("Storage").open(filename, "r");
    var line, lastLine;
    while ((line = file.readLine()) !== undefined) {
      lastLine = line; // Keep reading until the last line
    }

    // Determine the state based on the last entry in the task's log file
    if (lastLine && lastLine.startsWith("Start") && !lastLine.includes("Stop")) {
      state = "started"; // The last log entry is a "Start" without a consequent "Stop" - the task is ongoing
    } else {
      state = "stopped"; // Otherwise, it's either "Stop" or no entry, meaning the task is stopped
    }

    // Reinitialize the UI elements
    //Bangle.removeAllListeners("touch");
    setMainUI();
    drawMainMenu(); // Redraw UI to reflect the task change and the button state
  } else {
    print("Task does not exist!"); // Log an error or notify the user
  }
}

// Function to create a new task
function createNewTask() {
  // Load required widgets for the textinput
 // Bangle.loadWidgets();
 // Bangle.drawWidgets();
  
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
        tasks[taskName] = filename;
        
        // Open the new file to initialize it (optional)
        require("Storage").open(filename, "w").write("");

        // Set the new task as the current one and initialize the state to "stopped"
        currentTask = taskName;
        state = "stopped"; // <- This is the key part to ensure correct button initialization

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
}

// Function to display the list of tasks for selection
function chooseTask() {
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
}

// Function to annotate the current or last work session
function annotateTask() {
  var filename = tasks[currentTask];
  var file = require("Storage").open(filename, "r");
  var lastLine = "";
  var line;
  while ((line = file.readLine()) !== undefined) {
    lastLine = line; // Keep reading until the last line
  }
  file = undefined; // Close the file

  var promptTitle = "Annotate " + (state === "started" ? "Current" : "Last") + " Session";
  
  // Prompt the user to input the annotation text
  require("textinput").input({
    title: promptTitle,
    text: "" // Default empty text for annotation
  }).then(result => {
    var annotationText = result.trim();
    if (annotationText) {
      // Append annotation to the last or current log entry
      var annotatedEntry = lastLine + (lastLine ? "," : "") + "Annotation: " + annotationText + "\n";
      var file = require("Storage").open(filename, "a");
      file.write(annotatedEntry);
      //Bangle.removeAllListeners("touch");
      setMainUI();
      drawMainMenu(); // Redraw UI after adding the annotation
    } else {
      // User cancelled, so we do nothing and just redraw the main menu
      //Bangle.removeAllListeners("touch");
      setMainUI();
      drawMainMenu();
    }
  }).catch(e => {
    console.log("Annotation input error", e);
    setMainUI();
    drawMainMenu(); // In case of error also redraw main menu
  });
}

function syncAndroidObsidian(taskName) {
  // Open heading "Goal" in "my-file.md" (Important: Without syntax, only Goal):
  // obsidian://advanced-uri?vault=<your-vault>&filepath=my-file&heading=Goal

  //Bluetooth.println(JSONStringify({t:"intent", action:"android.intent.action.VIEW", data:}))
}

// Update the showMenu function to include "Change Task" option
function showMenu() {
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
    "Sync to Android>Obsidian": syncAndroidObsidian,
  };
  E.showMenu(menu);
}

function loadAppState() {
  var appData = require("Storage").readJSON("worklog_app_state.json", true) || {};

  currentTask = appData.currentTask || "default"; // Fallback to "default" if not set
  state = appData.state || "stopped"; // Fallback to "stopped" if not set
  tasks = appData.tasks || { // Load saved tasks, or create default if none exist
    default: "worklog_default.csv"
  };

  // Attempt to read the last log entry from the current task's file
  var filename = tasks[currentTask];
  var file = require("Storage").open(filename, "r");
  var line;
  var lastLine = "";
  while ((line = file.readLine()) !== undefined) {
    lastLine = line;
  }
  
  // If the last line contains "Start" and no corresponding "Stop" entry, update the state to "started"
  if (lastLine && lastLine.startsWith("Start") && !lastLine.includes("Stop")) {
    state = "started";
  } else {
    // Otherwise use the stored state or default to "stopped"
    state = appData.state || "stopped";
  }
}

// Additional code to manage app state ...
// When the application starts, load saved task and state then attach the touch event listener
loadAppState();

Bangle.loadWidgets();
drawMainMenu(); // Draw the main UI when the app starts
// When the application starts, attach the touch event listener
setMainUI();

