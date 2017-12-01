
// Load Hnode library
var hnode = require('./Hnode');

// Create new server
var server = new hnode.Server();

// Event: when a new node is detected
server.on('newnode', function(node) {

  // Event: when the node start
  node.on('start', function(node){
    console.log('start '+this.ip+' '+this.name+' (v'+this.version+')')
    console.log('TOTAL nodes: '+server.getAllNodes().length)

    var nList = []
    server.getAllNodes().forEach((node) => { nList.push(node.name.split('-')[1]) });

    console.log('ALL nodes: '+nList.sort())
  });

  // Event: when the node goes online
  //node.on('online', function(node){ console.log('online '+this.ip+' '+this.name) });

  // Event: when the node goes offline
  //node.on('offline', function(node){ console.log('offline '+this.ip+' '+this.name) });

  // Event: when the node stop
  node.on('stop', function(node){ console.log('stop '+this.ip+' '+this.name) });

  // Event: when the node stop
  node.on('fps', function(fps){ console.log('FPS '+this.name+' '+fps) });

  // Manual locked rate
  node.lockRate(1000/30);

});

// Set up a custom animation
var count = 0;
function animate() {
  this.blackout();          // switch off every leds
  this.getAllNodes().forEach(function(node) {
   	color = [255,255,255]
   	//if ((count % 90) == 10) color = [255,0,0]
    node.setLed(0, count%90, color);
    node.setLed(1, count%90, color);
    node.setLed(2, count%90, color);
    node.setLed(3, count%90, color);



  });
  count += 1;
}

// Bind animation to Server sequencer
server.on('tick', animate);

// Set Server sequencer timing @ 50 FPS
server.setRate(1000/30);

// Start server
server.start();
