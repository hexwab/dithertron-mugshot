const http = require("http").createServer();
const pty = require("node-pty");
const fs = require("fs");
//const os = require("os");
var cmd = "./process.sh";

const io = require("socket.io")(http, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
    var ptyProcess; 
    console.log("connected");
    var alltheoutput;
    var done=false;
    function exit() {
	//console.log(`exit,done=${done}`);
	if (!done) {
	var uef=fs.readFileSync("tmp.uef");
	io.emit("done", uef);
}
	done=true;
    }
    socket.on("run", (data) => {
	console.log("running");
	console.log(data);
	fs.writeFileSync("tmp.png", data.png);
	fs.writeFileSync("tmp.src.png", data.srcpng);
	fs.writeFileSync("tmp.src.png", data.srcpng);
	fs.writeFileSync("pic.bin", data.img);
	fs.writeFileSync("pal.bin", data.outpal);
	fs.writeFileSync("ula.bin", data.ula.toString());
	done=false;
	alltheoutput='';
	ptyProcess = pty.spawn(cmd, [], {
	    name: "xterm-color",
	    cols: 130,
	    rows: 20,
	    cwd: process.pwd,
	    env: process.env,
	});
	ptyProcess.on("data", function (data) {
	    io.emit("terminal.incomingData", data);
	    if (!done) {alltheoutput+=data;
	//console.log(`alltheoutput ${alltheoutput}`);
            if (alltheoutput.match(/picture ID is (\d+)/)) {
	//console.log("got id");
		exit();
            }
	    }
	});
	
	socket.on("terminal.keystroke", (data) => {
	    ptyProcess.write(data);
	});
	
	ptyProcess.on("exit", exit);
	io.emit("running");
    });
});

http.listen(8080, () => console.log("listening on http://localhost:8080"));
