var dgram = require('dgram');

var PORT = 3737;

var TICK_OFFLINE = 10;
var TICK_GONE = 30;

var NLEDS = 490;

function log(msg) {
  console.log(msg);
}

function Client(ip, info) {
  var that = this;

  this.ip = ip;
  this.name = info["name"];
  this.tick = 0;
  this.payload = Buffer.alloc(NLEDS*3, 0);
  this.timerate = 100;
  this.udp = null;
  this.timer = null;

  this.start = function() {
    this.udp = dgram.createSocket('udp4');
    this.timer = setInterval(that.refresh, that.timerate);
    console.log("Client running at "+that.timerate);
  }

  this.set = function(p) {
    this.payload = p;
  }

  this.refresh = function() {
    if (that.udp !== null)
      that.udp.send(that.payload, 0, that.payload.length, PORT, ip, function(err, bytes) {
          if (err) throw err;
          //  console.log('UDP message of '+message.length+' bytes sent to ' + ip +':'+ PORT);
      });
  }

  this.stop = function() {
    that.udp.close();
    clearInterval(that.timer);
  }

  this.updateRate = function(lastData) {
    /*if (lastData > this.timerate) {
      this.stop();
      this.timerate = lastData;
      this.start();
    }*/
    // TODO prevent overload
  }

  this.start();

}

function Server() {
  var that = this;

  this.udpSocket = dgram.createSocket('udp4');
  this.udpSocket.on('error', (err) => {
    console.log(`socket error:\n${err.stack}`);
    this.udpSocket.close();
  });
  this.udpSocket.on('listening', function () {
      var address = that.udpSocket.address();
      console.log('UDP Server listening on ' + address.address + ":" + address.port);
  });
  this.udpSocket.on('message', function (message, remote) {
      console.log(remote.address + ':' + remote.port +' - ' + message);
      that.updateClient(remote.address, JSON.parse(message));
  });

  this.clients = {};

  this.updateClient = function(ip, info) {
      var isNew = false;
      if (this.clients[ip] == null) {
        this.clients[ip] = new Client(ip, info);
        log("Client "+ip+" added");
        // TODO emit NEW
        console.log(ip+" is NEW");
        isNew = true;
      }

      if (this.clients[ip].tick >= TICK_OFFLINE || isNew) {
           // TODO emit ONLINE
           console.log(ip+" is ONLINE");
      }
      this.clients[ip].tick = 0;
      this.clients[ip].updateRate(info["lastData"]);

  }

  this.start = function() {
    this.timer = setInterval(that.ticker, 100);
    this.udpSocket.bind(PORT);
  }

  this.stop = function() {
    clearInterval(this.timer);
    for (var ip in that.clients) that.clients[ip].stop();
    this.udpSocket.close();
  }

  this.ticker = function() {
    for (var ip in that.clients) {
      if (that.clients[ip] !== null) {
        that.clients[ip].tick += 1;
        if (that.clients[ip].tick == TICK_OFFLINE) {
          console.log(ip+" is OFFLINE");
        }; // TODO emit OFFLINE
        if (that.clients[ip].tick == TICK_GONE) {
            console.log(ip+" is GONE");
            that.clients[ip] = null;
            // TODO emit GONE
        }
        //console.log('tick: '+that.clients[ip].tick)
      }
    }
  }

}

var server = new Server();
server.start();
