
var PORT = 3737
var CLIENT = '192.168.0.50'
var QOS = 0

var fps = require('../benchmark.js')
var aedes = require('aedes')()

//
// Message
//
var nLeds = 360;
var ledPayload = Buffer.alloc(nLeds*3, 255);

//
// MQTT Broker
//
var server = require('net').createServer(aedes.handle)

server.listen(PORT, function () {
  console.log('server listening on port', PORT)
})

//
// MQTT Publisher
//
function mqttSend() {
  aedes.publish({
      cmd: 'publish',
      qos: QOS,
      topic: 'ping',
      payload: ledPayload,
      retain: true
    });
  console.log("PING sent")
  fps.ping(true);
}


//
// MQTT Receiver
//
var mqtt = require('mqtt')
var client = mqtt.connect({ port: 3737, host: 'localhost', clean: true, keepalive: 0 });
function subscribe () {
  client.subscribe('pong', { qos: QOS })
}
client.on('connect', subscribe)
client.on('message', mqttSend)
