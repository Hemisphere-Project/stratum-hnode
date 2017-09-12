var dgram = require('dgram');

var PORT = 3737;
var CLIENT = '192.168.0.50';

//
// Benchmark
//
var pingTime = 0;
var pingAvg = [];
var avgSize = 500;
var process = require('process');

function timenow() {
  var hrTime = process.hrtime()
  return hrTime[0] * 1000 + hrTime[1] / 1000000;
}

//
// Message
//
var nLeds = 1;
//var message = new Buffer('My KungFu is Good!');
var ledPayload = Buffer.alloc(nLeds*3, 45);

//
// UDP sender
//
function udpSend(message) {
  if (message.length > 1472)
    throw new Error('UDP message > 1472 bytes, this is forbidden to avoid fragmentation..');

  var client = dgram.createSocket('udp4');
  client.send(message, 0, message.length, PORT, CLIENT, function(err, bytes) {
      if (err) throw err;
      console.log('UDP message of '+message.length+' bytes sent to ' + CLIENT +':'+ PORT);
      client.close();
  });
}


//
// UDP listener
//
var server = dgram.createSocket('udp4');

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('listening', function () {
    var address = server.address();
    console.log('UDP Server listening on ' + address.address + ":" + address.port);
});

server.on('message', function (message, remote) {
    //console.log(remote.address + ':' + remote.port +' - ' + message);
    pingAvg.unshift(1000/(timenow()-pingTime));
    if (pingAvg.length > avgSize) pingAvg.pop();
    console.log('frame rate: '+pingAvg.reduce((pv, cv) => pv+cv, 0)/pingAvg.length);
    pingTime = timenow();
    udpSend(ledPayload);
});





//
// RUN
//
server.bind(PORT);
udpSend(ledPayload);
