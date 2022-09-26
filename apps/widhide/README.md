# Hidable Widget Bar

Changes the way the widget bar works in clock faces. Instead of a static bar always shown at the top of the screen, it can now be shown and hidden by a swipe up and down, without changing the clock underneath.

This is possible with the new [`Bangle.setLCDOverlay()`](http://www.espruino.com/ReferenceBANGLEJS2#l_Bangle_setLCDOverlay) feature from firmware 2v15.

# Notes
* Clocks not designed to have the widgets hidden may show an empty black bar when the widgets are hidden. Contact the clock maintainer (or have a go at making the changes yourself) to use [`Bangle.appRect()`](http://www.espruino.com/ReferenceBANGLEJS2#l_Bangle_appRect) to get the drawable area of the screen.
* This will add widgets to clocks designed to hide them.

# TODO
* Add animation on showing and hiding the widget bar