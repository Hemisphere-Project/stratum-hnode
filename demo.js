
// Load Hnode library
var hnode = require('./Hnode');

// Create new server
var server = new hnode.Server();

// Event: when a new node is detected
server.on('newnode', function(node) {

  // Event: when the node start
  node.on('start', function(node){ console.log('start '+this.ip) });

  // Event: when the node goes online
  node.on('online', function(node){ console.log('online '+this.ip) });

  // Event: when the node goes offline
  node.on('offline', function(node){ console.log('offline '+this.ip) });

  // Event: when the node stop
  node.on('stop', function(node){ console.log('stop '+this.ip) });

});

// Start server
server.start();

// App example
var myFPS = 25;
setInterval(function() {
  server.setAll([255,0,0]);   // set every leds to red
  server.blackout();          // switch off every leds
  server.getAllNodes().forEach(function(node) {
    node.randomize();                   // randomize all leds of the node
    node.setLed(0, 10, [255,255,255]);  // set strip 0, led 60 to white
  });
}, Math.round(1000/myFPS));
