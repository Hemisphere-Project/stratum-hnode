var http = require('http');
var fs = require('fs');
var fps = require('../benchmark.js');

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


// When a client connects, we note it in the console
io.sockets.on('connection', function (client) {
    console.log('A client is connected!');
    console.log('Sending initial payload..');

    client.on("pong", function(data){
      console.log('got pong with "'+data+'" sending back ping');
      fps.ping(true);
      client.emit("ping", payload);
    });
    
    client.emit("ping", payload);
});


server.listen(8080);
