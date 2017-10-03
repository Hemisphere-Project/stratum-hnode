var dgram = require('dgram');
const EventEmitter = require('events');

var PORT_SERVER = 3737;          // Working UDP port
var PORT_NODE = 3738;          // Working UDP port

var TIME_TICK = 100;      // Watchdog timer ms
var TIME_OFFLINE = 1000;  // Offline Time
var TIME_GONE = 3000;     // Gone Time

var NLEDS_STRIPS = 90;    // N leds per strips
var NSTRIPS_CLIENT = 4;   // N strips per client

var NLEDS = NLEDS_STRIPS * NSTRIPS_CLIENT;
var TICK_OFFLINE = TIME_OFFLINE/TIME_TICK;
var TICK_GONE = TIME_GONE/TIME_TICK;

function log(msg) {
  console.log(msg);
}

class Worker extends EventEmitter {
  constructor() {
    super();

    this.isRunning  = false;
    this.timer      = null;
    this.timerate   = TIME_TICK;

  }

  start() {
    if (this.isRunning) this.stop();
    this.isRunning  = true;
    this.emit('start');
    this.next();
  }

  next() {
    var that = this;
    this.timer = setTimeout( function() {
      if (!that.isRunning) return;
      that.emit('tick');
      that.next();
    }, that.timerate);
  }

  stop()  {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning  = false;
    this.emit('stop');
  }

  setRate(tr) {
    this.timerate = tr;
    log('FPS: '+ Math.round(100000/tr)/100);

  }

}

class Client extends Worker {
  constructor(ip, info) {
    super();
    var that = this;

    this.ip = ip;
    this.name = info["name"];
    this.noNews = 0;
    this.udp = null;
    this.infoCounter = 0;
    this.payload = Buffer.alloc(NLEDS*3, 0);

    // send payload at every ticks
    this.on('tick', this.send);

    // stop udp
    this.on('stop', function() {
      if (that.udp != null) {
        that.udp.close();
        that.udp = null;
      }
      that.infoCounter = 0;
    });

  }

  _set(buffer) {
    this.payload = buffer;
  }

  //
  // args:  [ [ [r,g,b], [r,g,b], ... ], ... ]
  //
  setAll(rgbs) {
    for(var strip = 0; strip < NSTRIPS_CLIENT; strip += 1) {
      for (var led = 0; led < NLEDS_STRIPS; led+=1) {
        var key = (strip*NLEDS_STRIPS+led)*3;
        this.payload[key+led] = rgbs[led][0];
        this.payload[key+led+1] = rgbs[led][1];
        this.payload[key+led+2] = rgbs[led][2];
      }
    }
  }

  //
  // args: strip n°, [ [r,g,b], [r,g,b], ... ]
  //
  setStrip(strip, rgbs) {
    if (strip >= NSTRIPS_CLIENT) return;
    var key = (strip*NLEDS_STRIPS)*3;
    for (var led = 0; led < NLEDS_STRIPS; led+=1) {
      this.payload[key+led] = rgbs[led][0];
      this.payload[key+led+1] = rgbs[led][1];
      this.payload[key+led+2] = rgbs[led][2];
    }
  }

  //
  // args: strip n°, led n°, [r,g,b]
  //
  setLed(strip, led, rgb) {
    var key = (strip*NLEDS_STRIPS+led)*3;
    if (key >= NLEDS) return;
    this.payload[key] = rgb[0];
    this.payload[key+1] = rgb[1];
    this.payload[key+2] = rgb[2];
  }

  update(info) {

    // update received: should be running
    if (!this.isRunning) this.start();

    // first info received (since last reset)
    if (this.infoCounter == 0) this.emit('online');

    // state record
    this.infoCounter += 1;
    this.noNews = 0;

    // adjust refresh rate
    if (this.timerate < info["processing"]) // Processing takes more time => slow down
      this.setRate(this.timerate + Math.round(info["processing"]*0.3));   // Growing 30%

    else if (info["dataRate"] > info["processing"]+10) // 10ms for data transmission is too much => speed up
      this.setRate(Math.max(10,Math.round(info["dataRate"]*0.6)));     // Reducing 30%

    else if (this.timerate < info["dataRate"]) // Timerate is going too fast, dataRate doesn't follow => slow down
      this.setRate(this.timerate + Math.round(info["dataRate"]*0.3));     // Growing 30%

    // simplified auto-rate based on processing time + 5ms
    //this.setRate(info["processing"]+5);

    // inform data received
    this.emit('received', info);
  }

  check() {
    this.noNews += 1;

    // state control
    if (this.noNews == TICK_OFFLINE) {
      this.infoCounter = 0;
      this.emit('offline');
    }
    if (this.noNews == TICK_GONE) this.stop();

  }

  send() {
    var that = this;
    if (this.udp == null) this.udp = dgram.createSocket('udp4');
    if (this.payload != null)
      this.udp.send(this.payload, 0, this.payload.length, PORT_NODE, this.ip, function(err, bytes) {
          if (err) throw err;
          that.emit('sent', this.payload);
      });
  }

  randomize() {
    // random payload
    var data = Buffer.alloc(NLEDS*3 );
    for (var k = 0; k<NLEDS*3; k+=1)
      data[k] = Math.floor(Math.random() * 255)
    this._set(data);
  }

}

class Server extends Worker {
  constructor() {
    super();
    var that = this;
    this.clients = {};

    this.on('start', function() {
      that.udpSocket.bind(PORT_SERVER);
    });

    this.on('stop', function() {
      that.udpSocket.close();
      for (var ip in that.clients) that.clients[ip].stop();
    });

    this.on('tick', function() {
      for (var ip in that.clients) that.clients[ip].check();
    });

    this.configureUDP();
  }

  configureUDP() {
    var that = this;

    this.udpSocket = dgram.createSocket('udp4');

    this.udpSocket.on('error', (err) => {
      console.log(`socket error:\n${err.stack}`);
      that.udpSocket.close();
    });

    this.udpSocket.on('listening', function () {
        var address = that.udpSocket.address();
        console.log('UDP Server listening on port ' + address.port);
    });

    // Message received from client
    this.udpSocket.on('message', function (message, remote) {
        var ip = remote.address;
        var info = JSON.parse(message.toString('UTF-8'));

        // Create client if new
        if (that.clients[ip] == null) {
          that.clients[ip] = new Client(ip, info);
          that.emit('newnode', that.clients[ip]);
        }

        // Update client
        that.clients[ip].update(info);
    });
  }

  getNodeByIP(ip) {
    return this.clients[ip];
  }

  getNodeByName(name) {
    for (var ip in this.clients)
      if (this.clients[ip].name == name) return this.clients[ip];
  }

  getAllNodes() {
    var nodes = [];
    for (var ip in this.clients) nodes.push(this.clients[ip]);
    return nodes;
  }

  setAll(rgb) {
    for (var ip in this.clients)
      for(var strip=0; strip < NSTRIPS_CLIENT; strip += 1)
        for(var led=0; led < NLEDS_STRIPS; led += 1)
          this.clients[ip].setLed(strip, led, rgb);
  }

  blackout() {
    this.setAll([0,0,0]);
  }

}

// Export as module
exports.Server = Server;
