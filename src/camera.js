(() => {
  // The width and height of the captured photo. We will set the
  // width to the value defined here, but the height will be
  // calculated based on the aspect ratio of the input stream.

  const width = 640; // We will scale the photo width to this
  let height = 0; // This will be computed based on the input stream

  // |streaming| indicates whether or not we're currently streaming
  // video from the camera. Obviously, we start at false.

  let streaming = false;

  // The various HTML elements we need to configure or control. These
  // will be set by the startup() function.

  let video = null;
  let canvas = null;
  let photo = null;
  let startbutton = null;


  function startup() {
    video = document.getElementById("srcvideo");
    canvas = document.getElementById("srcimage");
    //photo = document.getElementById("photo");
    startbutton = document.getElementById("startButton");

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => {
        console.error(`An error occurred: ${err}`);
      });

    video.addEventListener(
      "canplay",
      (ev) => {
        if (!streaming) {
          height = video.videoHeight / (video.videoWidth / width);

          // Firefox currently has a bug where the height can't be read from
          // the video, so we will make assumptions if this happens.

          if (isNaN(height)) {
            height = width / (4 / 3);
          }
          video.setAttribute("width", width);
          video.setAttribute("height", height);
          canvas.setAttribute("width", width);
          canvas.setAttribute("height", height);
            streaming = true;
	    cropper.build();
        }
      },
      false
    );

    startbutton.addEventListener(
      "click",
	(ev) => {
	    if (video.paused) {
		video.play();
	    } else {
		video.pause();
		
		const context = canvas.getContext("2d");
		canvas.width = width;
		canvas.height = height;
		context.drawImage(video, 0, 0, width, height);
	    }
        ev.preventDefault();
      },
      false
    );

  }

  // Set up our event listener to run the startup process
  // once loading is complete.
  window.addEventListener("load", startup, false);
})();
