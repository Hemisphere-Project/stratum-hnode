
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

// Set up a custom animation
var count = 0;
function animate(server) {
  server.blackout();          // switch off every leds
  server.getAllNodes().forEach(function(node) {
    node.setLed(0, count%90, [255,255,255]);
    node.setLed(1, count%90, [255,255,255]);
    node.setLed(2, count%90, [255,255,255]);
    node.setLed(3, count%90, [255,255,255]);
  });
  count += 1;
}

// Bind animation to Server sequencer
server.on('tick', animate);

// Set Server sequencer timing @ 60 FPS
server.setRate(1000/60);

// Start server
server.start();
