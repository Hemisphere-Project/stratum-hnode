//
// FrameRate Benchmark
//
function benchmarker() {
  this.frameRate = 0;
  this.lastPing = 0;
  this.pingTimes = [];
  this.avgWindow = 500;
  this.time = require('process').hrtime;

  this.timenow = function() {
    var hrTime = process.hrtime()
    return hrTime[0] * 1000 + hrTime[1] / 1000000;
  }

  this.ping = function(log) {
    if (this.lastPing > 0) this.pingTimes.unshift(1000/(this.timenow()-this.lastPing));
    if (this.pingTimes.length > this.avgWindow) this.pingTimes.pop();
    if (this.pingTimes.length > 0) {
      this.frameRate = this.pingTimes.reduce((pv, cv) => pv+cv, 0)/this.pingTimes.length;
      if (log) console.log("FrameRate: "+Math.round(this.frameRate*100)/100+" FPS");
    }
    this.lastPing = this.timenow();
  };
}

module.exports = new benchmarker();
