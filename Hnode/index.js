const dgram = require('dgram');
const EventEmitter = require('events');

const defaultOptions = {
  PORT_SERVER: 3737, // Working UDP port
  TIME_TICK: 100, // Watchdog timer ms
  TIME_OFFLINE: 1000, // Offline Time
  TIME_GONE: 3000, // Gone Time
  NLEDS_STRIPS: 90, // N leds per strips
  NSTRIPS_CLIENT: 4, // N strips per client
  log : msg => console.log(msg) // custom log function (to write in file, etc)
}

module.exports = function (options) {
  options = Object.assign({}, defaultOptions, options || {});

  const NLEDS = options.NLEDS_STRIPS * options.NSTRIPS_CLIENT;

  class Worker extends EventEmitter {
    constructor() {
      super();

      this.isRunning  = false;
      this.timer      = null;
      this.timerate   = options.TIME_TICK;
      this.allowRateChange = true;
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
      if (!this.allowRateChange) return;
      this.timerate = Math.round(tr);
      this.emit('fps', Math.round(100000/tr)/100);
      // options.log('FPS: '+ Math.round(100000/tr)/100);
      // this.timerate = 50;
    }

    lockRate(tr) {
      this.allowRateChange = true;
      this.setRate(tr);
      this.allowRateChange = false;
    }

    unlockRate() {
      this.allowRateChange = true;
    }
  }

  class Client extends Worker {
    constructor(ip, info) {
      super();
      var that = this;

      this.name = info["name"];

      this.ip = ip;
      this.port = info["port"];

      this.noNews = 0;
      this.udp = null;
      this.infoCounter = 0;
      this.payload = Buffer.alloc(NLEDS*3, 0);

      this.setRate(1000/70);

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
      for (var strip = 0; strip <rgbs.length; strip += 1) {
        this.setStrip(strip, rgbs[strip]);
      }
    }

    //
    // args: strip n°, [ [r,g,b], [r,g,b], ... ]
    //
    setStrip(strip, rgbs) {
      for (var led = 0; led < rgbs.length; led += 1) {
        this.setLed(strip, led, rgbs[led])
      }
    }

    //
    // args: strip n°, led n°, [r,g,b]
    //
    setLed(strip, led, rgb) {
      var key = (strip * options.NLEDS_STRIPS + led) * 3;
      if (rgb.length !== 3 || key < 0 || key >= NLEDS * 3) return;
      this.payload[key + 0] = rgb[0];
      this.payload[key + 1] = rgb[1];
      this.payload[key + 2] = rgb[2];
    }

    update(ip, info) {
      // re-store info
      this.ip = ip
      this.port = info["port"]
      this.version = info["version"]

      // update received: should be running
      if (!this.isRunning) this.start();

      // first info received (since last reset)
      if (this.infoCounter == 0) this.emit('online');

      // state record
      this.infoCounter += 1;
      this.noNews = 0;

      // adjust refresh rate
      // if (this.timerate < info["processing"]) // Processing takes more time => slow down
      //   this.setRate(this.timerate + info["processing"]*0.3);   // Growing 30%
      //
      // else if (info["dataRate"] > info["processing"]+20) // 10ms for data transmission is too much => speed up
      //   this.setRate(Math.max(20, info["dataRate"]*0.6));     // Reducing 30%
      //
      // else if (this.timerate < info["dataRate"]) // Timerate is going too fast, dataRate doesn't follow => slow down
      //   this.setRate(this.timerate + info["dataRate"]*0.3);     // Growing 30%

      // simplified auto-rate based on processing time + 5ms
      //this.setRate(info["processing"]+5);

      // inform data received
      this.emit('received', info);
    }

    check( ticksOffline, ticksGone) {
      this.noNews += 1;

      // state control
      if (this.noNews == ticksOffline) {
        this.infoCounter = 0;
        this.emit('offline');
      }
      if (this.noNews == ticksGone) this.stop();
    }

    send() {
      var that = this;
      if (this.udp == null) this.udp = dgram.createSocket('udp4');
      // console.log(this.port, this.ip)
      if (this.payload != null) {
        this.udp.send(this.payload, 0, this.payload.length, this.port, this.ip, function(err, bytes) {
          if (err) {
            if (err.code == 'ENETUNREACH' || err.code == 'EADDRNOTAVAIL') {
              options.log('\nWarning: the server lost connection to the network');
              that.stop();
            }
            else throw err;
          }
          else that.emit('sent', that.payload);

        });
      }
    }

    randomize() {
      // random payload
      var data = Buffer.alloc(NLEDS*3 );
      for (var k = 0; k<NLEDS*3; k+=1) {
        data[k] = Math.floor(Math.random() * 255)
      }
      this._set(data);
    }
  }

  class Server extends Worker {
    constructor() {
      super();
      var that = this;
      this.clients = {};

      this.on('start', function() {
        that.udpSocket.bind(options.PORT_SERVER);
      });

      this.on('stop', function() {
        that.udpSocket.close();
        for (var name in that.clients) that.clients[name].stop();
      });

      this.on('tick', function() {
        var TICK_OFFLINE = Math.round(options.TIME_OFFLINE/that.timerate);
        var TICK_GONE = Math.round(options.TIME_GONE/that.timerate);
        for (var name in that.clients) that.clients[name].check(TICK_OFFLINE, TICK_GONE);
      });

      this.configureUDP();
    }

    configureUDP() {
      var that = this;

      this.udpSocket = dgram.createSocket('udp4');

      this.udpSocket.on('error', (err) => {
        options.log(`socket error:\n${err.stack}`);
        that.udpSocket.close();
      });

      this.udpSocket.on('listening', function () {
        var address = that.udpSocket.address();
        options.log('UDP Server listening on port ' + address.port);
      });

      // Message received from client
      this.udpSocket.on('message', function (message, remote) {
        var ip = remote.address;
        //var info = JSON.parse(message.toString('UTF-8'));
        var msg = message.toString('UTF-8').split('//')
        var info = {
          'name': msg[0],
          'port': msg[1],
          'version': msg[2]
        }
        var name = info['name'];

        // Create client if new
        if (that.clients[name] == null) {
          that.clients[name] = new Client(ip, info);
          that.emit('newnode', that.clients[name]);
          // options.log(ip, info)
        }

        // Update client
        that.clients[name].update(ip, info);
      });
    }

    getNodeByIP(ip) {
      for (var name in this.clients) {
        if (this.clients[name].ip == ip) return this.clients[name];
      }
    }

    getNodeByName(name) {
      return this.clients[name];
    }

    getAllNodes() {
      var nodes = [];
      for (var name in this.clients) nodes.push(this.clients[name]);
      return nodes;
    }

    setAll(rgb) {
      for (var name in this.clients)
        for(var strip=0; strip < options.NSTRIPS_CLIENT; strip += 1)
          for(var led=0; led < options.NLEDS_STRIPS; led += 1)
            this.clients[name].setLed(strip, led, rgb);
    }

    blackout() {
      this.setAll([0,0,0]);
    }
  }

  return { Server }
}
