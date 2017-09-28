

// Load Hnode library
var hnode = require('./Hnode');

// Create new server
var server = new hnode.Server();


// Event: when a new node is detected
server.on('newnode', function(node) {

  // Event: when the node start
  node.on('start', function(){ log('start '+ip) });

  // Event: when the node goes online
  node.on('online', function(){ log('online '+ip) });

  // Event: when the node goes offline
  node.on('offline', function(){ log('offline '+ip) });

  // Event: when the node stop
  node.on('stop', function(){ log('stop '+ip) });

  // Event: when the node did send a refresh
  node.on('sent', function(){
    node.randomize(); // randomize colors for the next refresh
  });

});


// Start server
server.start();
