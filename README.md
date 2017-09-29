# STRATUM
NodeJS Server / esp8266+W5500 Node

You can find a basic usage in demo.js

### Install
You need to copy Hnode directory in your project.

### Basic usage
```
  var hnode = require('./Hnode');   // load library
  var server = new hnode.Server();  // instantiate a server
  server.start();                   // start the server
```

### API
#### Server methods:
  `.getNodeByIP( ip )`      
      return a Node or undefined

  `.getNodeByName( name )`  
       return a Node or undefined

  `.getAllNodes()`  
      return an array with all known Nodes

  `.setAll( rgb )`  
      apply rgb array to every leds, rgb = [r,g,b]

  `.blackout()`  
      switch off every leds

#### Server events:
  `.on('newnode', function(node){ ... })`   
       triggered when a new Node is discovered

#### Node methods:
  `.setLed( strip, led, rgb )`   
       apply rgb array to a specific led, rgb = [r, g, b]

  `.setStrip( led, rgbs )`   
       apply rgbs array of array to a strip, rgbs = [ [r, g, b],  [r, g, b], ... ]

  `.setAll( rgbs )`   
       apply a whole set of 4 strips, rgbs = [ [ [r, g, b],  [r, g, b], ... ], ... ]

  `.randomize()`   
       randomize all values of the node's leds

#### Node attributes (read-only):
  `.name`   
  `.ip`

#### Node events:
  `.on('start', function(node){ ... }) `  
       triggered when a node is started

  `.on('online', function(node){ ... })`   
       triggered when a node goes online

  `.on('offline', function(node){ ... }) `  
       triggered when a node goes offline

  `.on('stop', function(node){ ... }) `  
       triggered when a node is stopped
