var dgram = require('dgram');

var PORT = 3737;          // Working UDP port

var TIME_TICK = 100;      // Watchdog timer ms
var TIME_OFFLINE = 1000;  // Offline Time
var TIME_GONE = 3000;     // Gone Time

var NLEDS = 490;

var TICK_OFFLINE = TIME_OFFLINE/TIME_TICK;
var TICK_GONE = TIME_GONE/TIME_TICK;

function log(msg) {
  console.log(msg);
}

function Client(ip, info) {
  var that = this;

  this.ip = ip;
  this.name = info["name"];
  this.tick = 0;
  this.payload = null;
  this.timerate = 10;
  this.udp = null;
  this.timer = null;
  this.autoRefresh = false;

  // start auto refresh
  this.start = function() {
    this.timer = null;
    this.autoRefresh = true;
    this.refresh();
    console.log("Client running at "+that.timerate);
  }

  // set payload sent during auto refresh
  this.set = function(p) {
    this.payload = p;
  }

  // refresh function: send payload to client
  this.refresh = function() {
    if (that.udp == null) that.udp = dgram.createSocket('udp4');
    if (that.payload != null)
      that.udp.send(that.payload, 0, that.payload.length, PORT, ip, function(err, bytes) {
          if (err) throw err;
          //console.log('UDP message of '+that.payload.length+' bytes sent to ' + ip +':'+ PORT);
      });
    if (that.autoRefresh) setTimeout(that.refresh, that.timerate);
    else that.stop();
  }

  // stop auto refresh and close udp socket
  this.stop = function() {
    if (that.udp != null) {
      that.udp.close();
      that.udp = null;
    }
    this.autoRefresh = false;
    this.infoCounter = 0;
  }

  // client sent updated info
  this.update = function(info) {
    if(this.autoRefresh) this.infoCounter += 1;

    // adjust refresh rate if device is lagging behind
    if (this.infoCounter > 3 && info["lastData"] > this.timerate) {
      this.timerate = info["lastData"]+1;
      console.log('new timerate: '+this.timerate)
    }
  }
}

function Server() {
  var that = this;

  this.clients = {};

  this.udpSocket = dgram.createSocket('udp4');

  this.udpSocket.on('error', (err) => {
    console.log(`socket error:\n${err.stack}`);
    this.udpSocket.close();
  });

  this.udpSocket.on('listening', function () {
      var address = that.udpSocket.address();
      console.log('UDP Server listening on ' + address.address + ":" + address.port);
  });

  // Message received from client
  this.udpSocket.on('message', function (message, remote) {
      //console.log(remote.address + ':' + remote.port +' - ' + message);
      var ip = remote.address;
      var info = JSON.parse(message);
      var isNew = false;

      // Create client if new
      if (that.clients[ip] == null) {
        that.clients[ip] = new Client(ip, info);
        // TODO emit NEW
        console.log(ip+" is NEW");
        isNew = true;

        // TODO: remove (test payload)
        that.clients[ip].set( Buffer.alloc(NLEDS*3, 254) );
      }

      // Back Online if previously Offline
      if (that.clients[ip].tick >= TICK_OFFLINE || isNew) {
           // TODO emit ONLINE
           that.clients[ip].start();
           console.log(ip+" is ONLINE");
      }

      // Update client
      that.clients[ip].tick = 0;
      that.clients[ip].update(info);
  });

  // Start client watchdog
  this.start = function() {
    this.timer = setInterval(that.ticker, 100);
    this.udpSocket.bind(PORT);
  }

  // Stop client watchdog
  this.stop = function() {
    clearInterval(this.timer);
    for (var ip in that.clients) that.clients[ip].stop();
  }

  // Client watchdog function
  this.ticker = function() {
    for (var ip in that.clients) {
      if (that.clients[ip] !== null) {
        that.clients[ip].tick += 1;
        if (that.clients[ip].tick == TICK_OFFLINE) {
          that.clients[ip].infoCounter = 0;
          console.log(ip+" is OFFLINE");
        }; // TODO emit OFFLINE
        if (that.clients[ip].tick == TICK_GONE) {
          that.clients[ip].stop();
          console.log(ip+" is GONE");
          // TODO emit GONE
        }
        //console.log('tick: '+that.clients[ip].tick)
      }
    }
  }

}

var server = new Server();
server.start();
