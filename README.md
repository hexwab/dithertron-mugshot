Dithertron mugshot thing
========================

As seen at [BSides Leeds 2023](https://sphere.chronosempire.org.uk/~HEx/gallery/), [LCSC 2023](https://sphere.chronosempire.org.uk/~HEx/tetley/), and [BSides Leeds 2024](https://sphere.chronosempire.org.uk/~HEx/gallery2/).

Parts
-----
* UI (`src/` and `index.html`): lightly forked from the [original dithertron](https://github.com/sehugg/dithertron) to add Beeb display modes, webcam input, and [PlayUEF](https://github.com/8bitkick/PlayUEF) integration

* Node server (`server/`): accepts images over a websocket and runs them through [exomizer](https://bitbucket.org/magli143/exomizer/wiki/Home), returning the result for playback in the browser
     also keeps copies of submitted images for the gallery

* Beeb listener (`mugshot/`): listens for and decompresses images coming in over the cassette port

* Gallery (`gallery/`): updates the gallery page as new images arrive

Building
--------
Good luck! :)

License
-------
Everything by me (Tom Hargreaves <hex@sphere.chronosempire.org.uk>) is in the public domain.  Other software is under its own licenses.
