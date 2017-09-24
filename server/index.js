var dgram = require('dgram');
const EventEmitter = require('events');

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
    log('new rate: '+ tr);
  }

}

class Client extends Worker {
  constructor(ip, info) {
    super();
    var that = this;

    this.ip = ip;
    this.name = info["name"];
    this.noNews = 0;
    this.payload = null;
    this.udp = null;
    this.infoCounter = 0;

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

  set(p) {
    this.payload = p;
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
      this.setRate(Math.max(10,Math.round(info["dataRate"]*0.7)));     // Reducing 30%

    else if (this.timerate < info["dataRate"]) // Timerate is going too fast, dataRate doesn't follow => slow down
      this.setRate(this.timerate + Math.round(info["dataRate"]*0.3));     // Growing 30%

    // inform data received
    this.emit('received', info);

    var data = Buffer.alloc(NLEDS*3 )
    for (var k = 0; k<NLEDS*3; k+=3)  data[k] = Math.floor(Math.random() * 255)
    this.set( data);
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
      this.udp.send(this.payload, 0, this.payload.length, PORT, this.ip, function(err, bytes) {
          if (err) throw err;
          that.emit('sent', this.payload);
      });
  }

}

class Server extends Worker {
  constructor() {
    super();
    var that = this;
    this.clients = {};

    this.on('start', function() {
      that.udpSocket.bind(PORT);
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
        console.log('UDP Server listening on ' + address.address + ":" + address.port);
    });

    // Message received from client
    this.udpSocket.on('message', function (message, remote) {
        var ip = remote.address;
        var info = JSON.parse(message);

        // Create client if new
        if (that.clients[ip] == null) {
          that.clients[ip] = new Client(ip, info);
          that.emit('new', that.clients[ip]);

          // LOG
          that.clients[ip].on('start', function(){ log('start '+ip) });
          that.clients[ip].on('online', function(){ log('online '+ip) });
          that.clients[ip].on('offline', function(){ log('offline '+ip) });
          that.clients[ip].on('stop', function(){ log('stop '+ip) });

          //that.clients[ip].on('sent', function(){ log('sent '+ip) });
        }

        console.log(ip + ':' + remote.port +' - ' + message+' / '+that.clients[ip].timerate);

        // Update client
        that.clients[ip].update(info);
    });
  }

}


// START Server
var server = new Server();
server.start();

// set test payload
server.on('new', function(client){
  client.set( Buffer.alloc(NLEDS*3, 254) );
});
