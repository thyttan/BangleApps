{
  const settings = Object.assign({
    global: false,
    apps: []
  }, require("Storage").readJSON("swipeinv.json", true) || {});

  let getAppIdFromSrc = ()=> {
    "ram"
    if (!global.__FILE__ || global.__FILE__===".bootcde") {
      return require("Storage").readJSON("setting.json",true).clock
    } else {return global.__FILE__.split(".")[0];}
  }

  if (settings.global || Object.keys(settings.apps).length > 0) {
    print("hi")
    const Object_on = Object.on;
    const Object_prependListener = Object.prependListener;

    const invertBeforeRegisteringListener = function(eventType, eventCallback){
      "ram"
      print("hi2")
      if (eventType === "swipe") {
        return (function(dirLR, dirUD) {
          print(dirLR, dirUD)
          if (settings.global ^ (settings.apps[getAppIdFromSrc()]&&settings.apps[getAppIdFromSrc()].swipeH)) {dirLR *= -1;}
          if (settings.global ^ (settings.apps[getAppIdFromSrc()]&&settings.apps[getAppIdFromSrc()].swipeV)) {dirUD *= -1;}
          print(dirLR, dirUD)
          eventCallback(dirLR, dirUD);
        })
      }
      if (eventType === "drag") {
        return (function(e) {
          if (settings.global ^ (settings.apps[getAppIdFromSrc()]&&settings.apps[getAppIdFromSrc()].dragH)) {e.dx *= -1;}
          if (settings.global ^ (settings.apps[getAppIdFromSrc()]&&settings.apps[getAppIdFromSrc()].dragV)) {e.dy *= -1;}
          eventCallback(e);
        })
      }
      return eventCallback;
    }

    Object.on = (parent, eventType /*string*/, eventCallback /*function reacting to event*/, addFirst)=>{
      "ram"
      print("hi3")
      const eventCallbackWrapped = invertBeforeRegisteringListener(eventType, eventCallback);
      print(eventType, eventCallbackWrapped)
      Object_on(parent, eventType, eventCallbackWrapped, addFirst);
    }

    Object.prependListener = function(parent, eventType /*string*/, eventCallback /*function reacting to event*/) {
      "ram"
      const eventCallbackWrapper = invertBeforeRegisteringListener(eventType, eventCallback);
      Object_prependListener(parent, eventType, eventCallbackWrapper);
    }
  }
}
