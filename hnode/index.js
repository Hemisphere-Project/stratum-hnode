
function log(msg) {
  console.log(msg);
}

function Client() {

}

function Server() {
  var that = this;

  this.clients = {};

  this.updateClient = function(ip, info) {
      if (this.clients[ip] == null) {
        this.clients[ip] = new Client(info);
        log("Client "+ip+" added");
      }
      
  }

  this.start = function() {
    this.stop();
    this.timer = setInterval(that.cleaner, 100);
  }

  this.cleaner = function() {

  }

}
