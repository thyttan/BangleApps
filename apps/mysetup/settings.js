// make sure to enclose the function in parentheses
(function(back) {
  let settings = require('Storage').readJSON('myappid.json',1)||{};
  if (typeof settings.monkeys !== "number") settings.monkeys = 12; // default value
  function save(key, value) {
    settings[key] = value;
    require('Storage').write('myappid.json', settings);
  }
  const appMenu = {
    '': {'title': 'App Settings'},
    '< Back': back,
    'Monkeys': {
      value: settings.monkeys,
      onchange: (m) => {save('monkeys', m)}
    }   
  };
  E.showMenu(appMenu)
})
