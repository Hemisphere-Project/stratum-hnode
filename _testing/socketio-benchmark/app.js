var http = require('http');
var fs = require('fs');
var process = require('process');

// Loading the index file . html displayed to the client
var server = http.createServer(function(req, res) {
    fs.readFile('./index.html', 'utf-8', function(error, content) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
});

// Loading socket.io
var io = require('socket.io').listen(server);
console.log('Server started');

/* payload v1 */
var payload = "";
for (var k=0; k<400; k++) payload += "rgb//"

/* payload v2 */
var ledsN = 1;
payload = new Buffer(ledsN*3);
for (var k=0; k<ledsN*3; k++) payload[k] = Math.floor(Math.random() * 256);
payload = payload.toString('ascii');


var pingTime;
var pingAvg = [];
var avgSize = 500;

function timenow() {
  var hrTime = process.hrtime()
  return hrTime[0] * 1000 + hrTime[1] / 1000000;
}

// When a client connects, we note it in the console
io.sockets.on('connection', function (client) {
    console.log('A client is connected!');
    console.log('Sending initial payload..');

    client.on("pong", function(data){
      console.log('got pong with "'+data+'" sending back ping');
      pingAvg.unshift(1000/(timenow()-pingTime));
      if (pingAvg.length > avgSize) pingAvg.pop();
      console.log('frame rate: '+pingAvg.reduce((pv, cv) => pv+cv, 0)/pingAvg.length);
      pingTime = timenow();
      client.emit("ping", payload);
    });

    pingTime = timenow();
    client.emit("ping", payload);
});


server.listen(8080);
