
declare var Cropper;
declare var pica;
declare var saveAs;
declare var sortable;

class ProxyDithertron {
    settings : DithertronSettings;
    lastPixels : PixelsAvailableMessage;

    constructor(worker : Worker) {
        worker.onmessage = (ev) => {
            var data = ev.data;
            if (data != null) {
                //console.log('recv',data);
                if (data.img != null && this.pixelsAvailable != null) {
                    this.pixelsAvailable(data);
                    this.lastPixels = data;
                }
            }
        };
    }
    setSettings(settings) {
        this.settings = settings;
        worker.postMessage({cmd:"setSettings", data:settings});
    }
    setSourceImage(img) {
        worker.postMessage({cmd:"setSourceImage", data:img});
    }
    setCustomPalette(pal) {
        worker.postMessage({cmd:"setCustomPalette", data:pal});
    }
    reset() {
        worker.postMessage({cmd:"reset"});
    }
    pixelsAvailable : (msg:PixelsAvailableMessage) => void;
}

const worker = new Worker("./gen/dithertron.js");
const dithertron = new ProxyDithertron(worker);

var resizeImageData : Uint32Array;
var filenameLoaded : string;

// DITHER SETTINGS
const DITHER_FLOYD = [[1, 0, 7/16], [-1, 1, 3/16], [0, 1, 5/16], [1, 1, 1/16]];
const DITHER_FALSEFLOYD = [[1, 0, 3/8], [0, 1, 3/8], [1, 1, 2/8]];
const DITHER_ATKINSON = [[1, 0, 1/6], [2, 0, 1/6], [-1, 1, 1/6], [0, 1, 1/6], [1, 1, 1/6], [0, 2, 1/6]];
const DITHER_SIERRA2 = [[1, 0, 4/16], [2, 0, 3/16], [-2, 1, 1/16], [-1, 1, 2/16], [0, 1, 3/16], [1, 1, 2/16], [2, 1, 1/16]];
const DITHER_SIERRALITE = [[1, 0, 2/4], [-1, 1, 1/4], [0, 1, 1/4]];
const DITHER_STUCKI =  [[1, 0, 8/42], [2, 0, 4/42], [-2, 1, 2/42], [1, -1, 4/42], [0, 1, 8/42], [1, 1, 4/42], [2, 1, 2/42], [-2, 2, 1/42], [-1, 2, 2/42], [0, 2, 4/42], [1, 2, 2/42], [2, 2, 1/42]];
const DITHER_TWOD = [[1, 0, 0.5], [0, 1, 0.5]];
const DITHER_RIGHT = [[1, 0, 1.0]];
const DITHER_DOWN = [[0, 1, 1.0]];
const DITHER_DOUBLE_DOWN = [[0, 1, 2/4], [0, 2, 1/4], [1, 2, 1/4]];
const DITHER_DIAG = [[1, 1, 1.0]];
const DITHER_VDIAMOND = [[0, 1, 6/16], [-1, 1, 3/16], [1, 1, 3/16], [-2, 2, 1/16], [0, 2, 2/16], [2, 2, 1/16]];

const ALL_DITHER_SETTINGS : DitherSetting[] = [
    {name:"Floyd-Steinberg", kernel:DITHER_FLOYD},
    {name:"False Floyd", kernel:DITHER_FALSEFLOYD},
    {name:"Atkinson", kernel:DITHER_ATKINSON},
    {name:"Sierra 2", kernel:DITHER_SIERRA2},
    {name:"Sierra Lite", kernel:DITHER_SIERRALITE},
    {name:"Stucki", kernel:DITHER_STUCKI},
    {name:"Two-D", kernel:DITHER_TWOD},
    {name:"Right", kernel:DITHER_RIGHT},
    {name:"Down", kernel:DITHER_DOWN},
    {name:"Double Down", kernel:DITHER_DOUBLE_DOWN},
    {name:"Diagonal", kernel:DITHER_DIAG},
    {name:"Diamond", kernel:DITHER_VDIAMOND},
];

const ERROR_FUNCS = [
    {id:'hue', name:"Hue-Based"},
    {id:'perceptual', name:"Perceptual"},
    {id:'dist', name:"Distance"},
    {id:'max', name:"Maximum"},
];

//

function getCanvasImageData(canvas) {
    return new Uint32Array(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.buffer);
}
function drawRGBA(dest, arr) {
    var ctx = dest.getContext('2d');
    var imageData = ctx.createImageData(dest.width, dest.height);
    var datau32 = new Uint32Array(imageData.data.buffer);
    if (datau32.length == arr.length) {
        datau32.set(arr);
        ctx.putImageData(imageData, 0, 0);
    } else {
        console.log("drawRGBA(): array length mismatch");
        // TODO: source array is too long when switching
    }
}
function applyBrightness(imageData:Uint32Array, bright:number, bias:number, sat:number) {
    bright *= 1;
    bias *= 1;
    var u8arr = new Uint8ClampedArray(imageData.buffer);
    for (var i=0; i<u8arr.length; i+=4) {
        var r = u8arr[i];
        var g = u8arr[i+1];
        var b = u8arr[i+2];
        if (sat != 1.0) {
            var gray = 0.2989*r + 0.5870*g + 0.1140*b; //weights from CCIR 601 spec
            r = gray * (1-sat) + r * sat;
            g = gray * (1-sat) + g * sat;
            b = gray * (1-sat) + b * sat;
        }
        u8arr[i] = r * bright + bias;
        u8arr[i+1] = g * bright + bias;
        u8arr[i+2] = b * bright + bias;
    }
}

function reprocessImage() {
    var resizeImageData = getCanvasImageData(resize);
    let bright = (parseFloat(contrastSlider.value) - 50) / 100 + 1.0; // middle = 1.0, range = 0.5-1.5
    let bias = (parseFloat(brightSlider.value) - bright * 50) * (128 / 50);
    let sat = (parseFloat(saturationSlider.value) - 50) / 50 + 1.0; // middle = 1.0, range = 0-2
    applyBrightness(resizeImageData, bright, bias, sat);
    dithertron.setSourceImage(resizeImageData);
    resetImage();
}

function resetImage() {
    var opt = ($("#diffuseTypeSelect")[0] as HTMLSelectElement).selectedOptions[0];
    // TODO: what if settings not yet set?
    if (opt) {
        dithertron.settings.ditherfn = ALL_DITHER_SETTINGS[parseInt(opt.value)].kernel;
    }
    var opt = ($("#errorFuncSelect")[0] as HTMLSelectElement).selectedOptions[0];
    if (opt) {
        dithertron.settings.errfn = opt.value;
    }
    dithertron.settings.diffuse = parseFloat(diffuseSlider.value) / 100;
    dithertron.settings.noise = parseFloat(noiseSlider.value);
    if (0 && // !($("#autoPalette")[0] as HTMLInputElement).checked &&
       dithertron.lastPixels &&
       dithertron.lastPixels.pal.length == dithertron.settings.reduce) {
           // TODO: check all the palette entries are valid; we might have changed system? 
           dithertron.setCustomPalette(dithertron.lastPixels.pal);
    } else {
           //$('#autoPalette').prop('checked',true);
           dithertron.setCustomPalette(null);
    }
    dithertron.setSettings(dithertron.settings);
    dithertron.reset();
}

function convertImage() {
    const canvas = cropper.getCroppedCanvas();
    if (!canvas) return;
    pica().resize(canvas, resize, {
        /*
        unsharpAmount: 50,
        unsharpRadius: 0.5,
        unsharpThreshold: 2
        */
    }).then(() => {
        reprocessImage();
    });
}

function formatAspectRatio(r) {
    const getAspect = (r, eps) => {
	const c = ((e, x, y) => {
	    const _gcd = (a, b) => (b < e ? a : _gcd(b, a % b));
	    return _gcd(x, y);
        })(eps, 1, r);
	return `${Math.floor(r / c)}:${Math.floor(1 / c)}`;
    },
    decString = new Intl.NumberFormat('en-us', {minimumFractionDigits: 2}).format(r),
    fracString = getAspect(r, 1/50);

    return `${decString} (${fracString})`;
}

function getSystemInfo(sys : DithertronSettings) {
    if (0 && !!(($('#customSize')[0] as HTMLInputElement).checked)) {
	var s = `<input type=number class=custom-size-input step=8 id=width value=${sys.width}></input> ×
	        <input type=number class=custom-size-input id=height value=${sys.height}></input>`;
    } else {
	var s = sys.width + " × " + sys.height;
    }
    if (sys.reduce) s += ", " + sys.reduce + " out of " + sys.pal.length + " colors";
    else if (sys.pal) s += ", " + sys.pal.length + " colors";
    if (sys.block) {
        s += ", ";
        s += sys.block.colors + " colors per ";
        s += sys.block.w + "×" + sys.block.h + " block";
    }
    if (sys.pxclk) {
	s += ` (${new Intl.NumberFormat('en-us', {minimumFractionDigits: 3}).format(sys.pxclk/1e6)} MHz pixel clock)`;
    }
    return s;
}

function getAspectInfo(sys : DithertronSettings) {
    var s = "Image aspect ratio " + formatAspectRatio((sys.scaleX||1)*sys.width/sys.height);
    s += ", pixel aspect ratio " + formatAspectRatio(sys.scaleX||1);
    return s;
}

function showSystemInfo() {
    const sys = dithertron.settings;
    $("#targetFormatInfo").html(getSystemInfo(sys));
    $("#targetAspectInfo").text(getAspectInfo(sys));
    try {
	$("#width").on('input', changeSize);
	$("#height").on('input', changeSize);
    } catch(e) {}

}

function reorderPalette(e) {
    const pal = dithertron.lastPixels.pal,
          start = e.detail.origin.index,
          end = e.detail.destination.index,
	  dir = Math.sign(end-start),
	  entry = pal[start];
    if (!dir) return;
    //console.log(`start=${start} end=${end} dir=${dir} entry=${entry}`);
    for (var i=start; i!=end; i+=dir) {
        console.log(i);
        pal[i] = pal[i+dir];
    }
    pal[end] = entry;

    //$('#autoPalette').prop('checked',false);
    resetImage();
}

function updatePaletteSwatches(pal:Uint32Array) {
    var swat = $("#paletteSwatches");
    swat.empty();
    if (pal && pal.length < 64) {
        pal.forEach((col,index) => {
            var rgb = "rgb(" + (col&0xff) + "," + ((col>>8)&0xff) + "," + ((col>>16)&0xff) + ")";
            var sq = $(`<span class="palentry">${index.toString(16)}</span>`).css("background-color",rgb);
            swat.append(sq);
        });
    }
    sortable('#paletteSwatches');
    //sortable('#paletteSwatches',dithertron.settings.reduce?'enable':'disable');
    sortable('#paletteSwatches','disable');
}

var brightSlider = document.getElementById('brightSlider') as HTMLInputElement;
var contrastSlider = document.getElementById('contrastSlider') as HTMLInputElement;
var saturationSlider = document.getElementById('saturationSlider') as HTMLInputElement;
var noiseSlider = document.getElementById('noiseSlider') as HTMLInputElement;
var diffuseSlider = document.getElementById('diffuseSlider') as HTMLInputElement;
var imageUpload = document.getElementById("imageUpload") as HTMLInputElement;
const image = document.getElementById('srcimage') as HTMLImageElement;
const resize = document.getElementById('resizecanvas') as HTMLCanvasElement;
const dest = document.getElementById('destcanvas') as HTMLCanvasElement;
//const cmdline = document.getElementById('cmdline');

// https://github.com/fengyuanchen/cropperjs/blob/master/README.md
const cropper = new Cropper(image, {
    viewMode:1,//0,//1,
    initialAspectRatio: 4/3,
    crop(event) {
        const imageData = cropper.getImageData(),
              cropData = cropper.getData(true);
	$('#srcInfo').text(`Image is ${imageData.naturalWidth} × ${imageData.naturalHeight}, aspect ratio ${formatAspectRatio(imageData.aspectRatio)}`);
	$('#cropInfo').text(`Cropped to ${cropData.width} × ${cropData.height}, aspect ratio ${formatAspectRatio(cropData.width/cropData.height)}`);
        convertImage();
    },
});
function loadSourceImage(url,filename) {
    filenameLoaded = filename;
    cropper.replace(url);
}

function setAspectLock() {
    const sys = dithertron.settings,
      oldcrop = cropper.getCropBoxData();
    if (($('#lockAspect')[0] as HTMLInputElement).checked)
	cropper.setAspectRatio((sys.scaleX||1)*sys.width/sys.height);
    else
        cropper.setAspectRatio(0);
    cropper.setCropBoxData(oldcrop); // preserve as best we can
}

function setCustomSize() {
    const sys = dithertron.settings;
    if (!sys.defaultwidth) sys.defaultwidth=sys.width;
    if (!sys.defaultheight) sys.defaultheight=sys.height;
    showSystemInfo();
    changeSize();
}
function changeSize() {
    const sys = dithertron.settings;
    try {
	sys.width = ($('#width')[0] as HTMLInputElement).valueAsNumber;
	sys.height = ($('#height')[0] as HTMLInputElement).valueAsNumber;
    } catch(e) {
	sys.width = sys.defaultwidth;
	sys.height = sys.defaultheight;
    }
    setTargetSystem(sys);
}
//
function setTargetSystem(sys : DithertronSettings) {
    var showNoise = sys.conv != 'DitheringCanvas';
    dithertron.setSettings(sys);
    console.log(`w=${sys.width} h=${sys.height}`);

    resize.width = dest.width = sys.width;
    resize.height = dest.height = sys.height;
    if (dest.style.aspectRatio !== undefined) {
        dest.style.aspectRatio = ""+sys.width/sys.height*(sys.scaleX||1);
    } else {
        dest.style.transform = 'scaleX('+(sys.scaleX||1)+')';
        var widthPct = 90 / (sys.scaleX || 1);
        if (widthPct < 100) {
            dest.style.width = (90/(sys.scaleX||1))+'%';
        } else {
            dest.style.width = '100%';
        }
    }
    setAspectLock();
    $("#noiseSection").css('display',showNoise?'flex':'none');
    //$("#downloadNativeBtn").css('display',sys.toNative?'inline':'none');
    //$("#autoPaletteWrapper").css('display',sys.reduce?'inline':'none');
    //$("#gotoIDE").css('display',getCodeConvertFunction()?'inline':'none');
    convertImage();
}


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
    let socket = null;
    let term = null;

function doTerm() {
    // @ts-ignore
    socket = io("ws://localhost:8080");
    // @ts-ignore
    term = new Terminal({cols:130,rows:20});
    term.options.fontFamily="DejaVu Sans Mono";
//    term.options.rows=20;
    term.open(document.getElementById("terminal"));
    console.log(term);
    socket.on("terminal.incomingData", (data) => {
	term.write(data);
    });
    socket.on("done", (data) => {
	doUEF(data,true);
    });
    socket.on("running", () => {
	term.clear();
	$("#termwrapper").css("display","block");
	$("#overturboButton").click();
    });

    term.onData((data) => {
	socket.emit("terminal.keystroke", data);
    });
}
let lastuef = null;
function setUEF(lo,hi,phase) {
    // @ts-ignore
    $('#lowfreqSlider').slider('setValue',lo);//,true);
    // @ts-ignore
	$('#lowfreqLabel')[0].innerHTML=
    // @ts-ignore
	    $('#lowfreqSlider').slider('getValue');
    // @ts-ignore
    $('#highfreqSlider').slider('setValue',hi);//,true);
    // @ts-ignore
	$('#highfreqLabel')[0].innerHTML=
    // @ts-ignore
	    $('#highfreqSlider').slider('getValue');
    // @ts-ignore
    $('#phaseSlider').slider('setValue',phase);//,true);
    // @ts-ignore
	$('#phaseLabel')[0].innerHTML=
    // @ts-ignore
	    $('#phaseSlider').slider('getValue');
}

function doUEF(data,autoplay) {
    lastuef=data;
    // @ts-ignore
    window.uefdata=data;
    // @ts-ignore
    var lowfreqSlider = document.getElementById('lowfreqSlider') as HTMLInputElement;
    var highfreqSlider = document.getElementById('highfreqSlider') as HTMLInputElement;
    var phaseSlider = document.getElementById('phaseSlider') as HTMLInputElement;
    var lo=parseInt(lowfreqSlider.dataset.value);
    var hi=parseInt(highfreqSlider.dataset.value);
    var phase=parseInt(phaseSlider.dataset.value);
    var wav=uef2wave (new Uint8Array(data), lo, 48000, 1, phase, 0, hi);
    const blob = new Blob([wav.wav], { type: 'audio/wav' });
    const url = window.URL.createObjectURL(blob);

    // Connect WAV to the audio player
    const audio = document.getElementById('audio');
    const source = document.getElementById('source');
    // Insert blob object URL into audio element & play.
    // @ts-ignore
    source.src = url;
    // @ts-ignore
    audio.load();
    // @ts-ignore
    if (autoplay)audio.play();
    //cassette(200, 0, "MUGSHOT", lo, "1.1");
}
window.addEventListener('load', function() {
/*    document.querySelector('input[type="file"]').addEventListener('change', function() {
        var file = this.files && this.files[0];
        if (file) {
            var url = URL.createObjectURL(file);
            loadSourceImage(url,file.name);
	    this.value=null;
        }
    });
*/
    /*
    SYSTEMS.forEach(sys => {
        var opt = sys ? $("<option />").text(sys.name).val(sys.id) : $("<option disabled></option>");
        $("#targetFormatSelect").append(opt);
	});
	*/
    ALL_DITHER_SETTINGS.forEach((dset,index) => {
        var opt = $("<option />").text(dset.name).val(index);
        $("#diffuseTypeSelect").append(opt);
    });
    ERROR_FUNCS.forEach((dset, index) => {
        var opt = $("<option />").text(dset.name).val(dset.id);
        $("#errorFuncSelect").append(opt);
    });

    dithertron.pixelsAvailable = (msg) => {
        // TODO: resize canvas?
        drawRGBA(dest, msg.img);
        updatePaletteSwatches(msg.pal);
        /*
        if (msg.final) {
            dest.toBlob((blob) => {
                $("#pngBytes").text(blob.size+"");
            }, 'image/png');
        }
        */
    }

    //filenameLoaded = EXAMPLE_IMAGES[Math.random() * EXAMPLE_IMAGES.length|0];
    //loadSourceImage("images/" + filenameLoaded, filenameLoaded);
    setTargetSystem(SYSTEM_LOOKUP['bbcmicro.mode1.overscan']);
    showSystemInfo();

    $("#diffuseSlider").on('change', resetImage);
    $("#noiseSlider").on('change', resetImage);
    $("#brightSlider").on('change', reprocessImage);
    $("#contrastSlider").on('change', reprocessImage);
    $("#saturationSlider").on('change', reprocessImage);
    $("#resetButton").on('click', resetImage);
    $("#diffuseTypeSelect").on('change', resetImage);
/*
    $("#targetFormatSelect").change((e) => {
        var opt = (e.target as HTMLSelectElement).selectedOptions[0];
        if (opt) {
            setTargetSystem(SYSTEM_LOOKUP[opt.value]);
	    showSystemInfo();
        }
	});
*/
    $("#setmode0").on('click', ()=>{
        setTargetSystem(SYSTEM_LOOKUP['bbcmicro.mode0.overscan']);
	showSystemInfo();
    });
    $("#setmode1").on('click', ()=>{
        setTargetSystem(SYSTEM_LOOKUP['bbcmicro.mode1.overscan']);
	showSystemInfo();
    });
    $("#setmode2").on('click', ()=>{
        setTargetSystem(SYSTEM_LOOKUP['bbcmicro.mode2.overscan']);
	showSystemInfo();
    });

    video = $("#srcvideo")[0];
    canvas = $("#srcimage")[0];
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

	//$("#srcvideo").on('canplay',(ev) => {
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
	    ///cropper.disable();
        }
      },
	false);
    function startVideo() {
	if (!video.paused) return;
	    //cropper.disable();
	    video.play();
	    $("#srcvideo").css("display","block");
	    $("#srcimage").css("display","none");
	    $("#startButton")[0].innerHTML="Take photo!";
	    //$("#sendButton").prop("disabled",true);
    }
    function stopVideo() {
	    video.pause();
	    
	    //canvas.width = width;
	    //canvas.height = height;
	    const context = canvas.getContext("2d");
	    context.drawImage(video, 0, 0, width, height);
	    $("#srcvideo").css("display","none");
	    $("#srcimage").css("display","block");
	    cropper.replace(canvas.toDataURL("image/png"));
	    //cropper.enable();
	    $("#startButton")[0].innerHTML="Restart camera";
	    //$("#sendButton").prop("disabled",false);
    }	
    $("#startButton").click(()=>{
	if (video.paused) {
	    startVideo();
	} else {
	    stopVideo();
	}
    });
    
    $("#errorFuncSelect").on('change', resetImage);
    //$("#downloadImageBtn").click(downloadImageFormat);
    //$("#downloadNativeBtn").click(downloadNativeFormat);
    $("#sendButton").click(doSend);
    $("#doneButton").click(()=>{
	$("#termwrapper").css("display","none");
	//startVideo();
    });
    $("#oversafeButton").click(()=>setUEF(1200,2400,180));
    $("#overturboButton").click(()=>setUEF(1350,6000,240));
    $("#overredoButton").click(()=>{
	const audio = document.getElementById('audio');
    // @ts-ignore
	audio.pause();
	doUEF(lastuef,false);
    // @ts-ignore
	setTimeout(()=>{audio.play()},900);
    });
    // @ts-ignore
    $('#lowfreqSlider').on('change',()=>{
    // @ts-ignore
	$('#lowfreqLabel')[0].innerHTML=
    // @ts-ignore
	    $('#lowfreqSlider').slider('getValue');
    });
    // @ts-ignore
    $('#highfreqSlider').on('change',()=>{
    // @ts-ignore
	$('#highfreqLabel')[0].innerHTML=
    // @ts-ignore
	    $('#highfreqSlider').slider('getValue');
    });
    // @ts-ignore
    $('#phaseSlider').on('change',()=>{
    // @ts-ignore
	$('#phaseLabel')[0].innerHTML=
    // @ts-ignore
	    $('#phaseSlider').slider('getValue');
    });
			   
    //$("#gotoIDE").click(gotoIDE);
    //$("#autoPalette").on('change', resetImage);
    //$("#customSize").on('change', setCustomSize);
    $("#lockAspect").on('change', setAspectLock);
    //$('#paletteSwatches').on('sortupdate',reorderPalette);
    $("#termwrapper").css("display","none");
    setUEF(1200,6000,240);
    doTerm();
});

// print diags (TODO: generate markdown table)
if (window.location.search == '?printmeta') {
    function printSystems() {
        var s = "";
        SYSTEMS.forEach((sys) => {
            if (sys) s += "* " + sys.name + " - " +getSystemInfo(sys) + "\n";
        });
        console.log(s);
    }
    printSystems();
}
