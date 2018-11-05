const dgram = require('dgram');
const EventEmitter = require('events');

const defaultOptions = {
  PORT_SERVER: 3737, // Working UDP port
  TIME_TICK: 100, // Watchdog timer ms
  TIME_OFFLINE: 1000, // Offline Time
  TIME_GONE: 3000, // Gone Time
  NLEDS_STRIPS: 178, // N leds per strips
  NSTRIPS_CLIENT: 4, // N strips per client
  CLIENT_FRAME_RATE: 60, // UDP frame sent by second (Rythmus = 2 frame to refresh a whole client)
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
      //if (!this.allowRateChange) return;
      this.timerate = Math.round(tr);
      this.emit('fps', Math.round(100000/tr)/100);
      options.log('FPS: '+ Math.round(100000/tr)/100);
      // this.timerate = 50;
    }

    /*lockRate(tr) {
      this.allowRateChange = true;
      this.setRate(tr);
      this.allowRateChange = false;
    }

    unlockRate() {
      this.allowRateChange = true;
    }*/
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
      this.nextBuffer = 0;

      this.payload = []
      this.dualBuffers = []
      for (var s=0; s<options.NSTRIPS_CLIENT; s++) {
        this.payload[s] = Buffer.alloc(options.NLEDS_STRIPS*3+1, 0);
        this.payload[s][0] = s    //first byte of payload is strip number
      }
      for (var s=0; s<options.NSTRIPS_CLIENT; s+=2) {
        this.dualBuffers[s/2] = Buffer.alloc((options.NLEDS_STRIPS*3+1)*2, 0);
      }

      this.setRate(1000/(options.CLIENT_FRAME_RATE*this.dualBuffers.length));

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
      var key = led * 3 + 1;
      if (rgb.length !== 3 || key < 1 || key > options.NLEDS_STRIPS * 3) return;

      // VOLTAGE DROP CORRECTOR
      var level = (rgb[0]+rgb[1]+rgb[2])/(3*255)
      level = Math.max(0, level-0.2)
      var dec = level * (options.NLEDS_STRIPS-led)/2
      var blue_dec = level * (options.NLEDS_STRIPS-led)/3
      var red_dec = level * led/3

      rgb[0] = Math.max(0, (rgb[0] - dec) - red_dec)
      rgb[1] = Math.max(0, (rgb[1] - dec))
      rgb[2] = Math.max(0, (rgb[2] - dec - blue_dec))
      // console.log(led, rgb, dec)

      this.payload[strip][key + 0] = Math.floor(rgb[0]);
      this.payload[strip][key + 1] = Math.floor(rgb[1]);
      this.payload[strip][key + 2] = Math.floor(rgb[2]);
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

      // Push-Pull strips (dual strip)

      // Refresh buffer
      if (this.nextBuffer == 0)
        for (var b=0; b<options.NSTRIPS_CLIENT; b+=2) {
          this.dualBuffers[b/2].set(this.payload[b], 0)
          this.dualBuffers[b/2].set(this.payload[b+1], (options.NLEDS_STRIPS*3+1))
        }

      // Send next buffer
      var dualPayload = this.dualBuffers[this.nextBuffer]
      this.udp.send(dualPayload, 0, dualPayload.length, this.port, this.ip, function(err, bytes) {
        if (err) {
          if (err.code == 'ENETUNREACH' || err.code == 'EADDRNOTAVAIL') {
            options.log('\nWarning: the server lost connection to the network');
            that.stop();
          }
          else throw err;
        }
        else that.emit('sent', dualPayload);
      });
      this.nextBuffer+=1
      if (this.nextBuffer >= this.dualBuffers.length) this.nextBuffer = 0

      // Round-Robin strips
      /*if (this.payload[this.nextStrip] != null) {
        // console.log(this.port, this.ip)
        this.udp.send(this.payload[this.nextStrip], 0, this.payload[this.nextStrip].length, this.port, this.ip, function(err, bytes) {
          that.nextStrip+=1
          if (that.nextStrip >= options.NSTRIPS_CLIENT) that.nextStrip = 0
          if (err) {
            if (err.code == 'ENETUNREACH' || err.code == 'EADDRNOTAVAIL') {
              options.log('\nWarning: the server lost connection to the network');
              that.stop();
            }
            else throw err;
          }
          else that.emit('sent', that.payload[that.nextStrip]);

        });
      }*/

    }

    randomize() {
      for (var s=0; s<NSTRIPS_CLIENT; s++) {
        // random payload
        var data = Buffer.alloc(NLEDS_STRIPS*3+1);
        data[0] = s;
        for (var k = 1; k<=NLEDS_STRIPS*3; k+=1)
          data[k] = Math.floor(Math.random() * 255)
        this.payload[s] = data;
      }
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
        if (msg.length < 3) return;
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
