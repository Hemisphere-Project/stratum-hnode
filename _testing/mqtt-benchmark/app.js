
var PORT = 3737
var CLIENT = '192.168.0.50'
var QOS = 0

var fps = require('../benchmark.js')
var broker;
var server;
var ENGINE = 1;

//
// Message
//
var nLeds = 40;
var ledPayload = Buffer.alloc(nLeds*3, 44);

//
// MQTT broker
//
if(ENGINE == 1) {
  var aedes = require('aedes')()
  server = require('net').createServer(aedes.handle)
  server.listen(PORT, function () {
    console.log('server listening on port', PORT)
  })
}
else if (ENGINE == 2) {
  var mosca = require('mosca')
  server = new mosca.Server({ port: PORT });
}

//
// MQTT Receiver
//
var mqtt = require('mqtt')
var client = mqtt.connect({ port: PORT, host: 'localhost', clean: true, keepalive: 0 });
client.on('connect', function() {
  client.subscribe('pong', { qos: QOS })
});
client.on('message', function (topic, message) {
  client.publish('ping', ledPayload);
  console.log("PING sent with Led Payload");
  fps.ping(true);
})


//setInterval(function(){mqttSend(true)}, 300);
