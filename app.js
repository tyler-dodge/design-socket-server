var express = require('express');
var http = require('http'); 
var socket = require('socket.io');
var events = require('events');
var util = require('util');
var fs = require('fs');
var path = require('path');

var default_options = {
  port: 3000,
  dir: '.'
};
module.exports = function(options) {
  options = options || {};
  options.port = options.port || default_options.port;
  options.dir = options.dir || default_options.dir;

  var app = express();
  var server = http.createServer(app);
  var io = socket.listen(server, {
    'log level': '0'
  });
  var dir = path.resolve(options.dir);

  var RefreshEventer = function(){
    events.EventEmitter.call(this);
    this.refresh_file = function(file) {
      this.emit("refresh", file);
    };
  };
  util.inherits(RefreshEventer, events.EventEmitter);
  RefreshEventer = new RefreshEventer();

  app.use(function(req, res, next) {
    if (req.url.match(/\.css/) !== null) {
      if (req.url.indexOf(".css?") !== -1) {
        req.url = req.url.substr(0,req.url.indexOf(".css?") + 4);
      }
      if (!options[req.url]) {
        options[req.url] = true;
        fs.watchFile(dir + req.url, { 
          persistent: true, 
          interval: 500
        }, (function(file) {
          return function() {
            RefreshEventer.refresh_file(file);
          };
        })(req.url));
      }
    } else {
    }
    next();
  });
  app.set('views', dir );
  app.use('/design_socket', express['static'](__dirname + "/lib"));
  
  var file_cache = {};
  function handle_html(req, res) {
    if (req.url.charAt(req.url.length-1) === '/') {
      req.url += 'index.html';
    }
    var html = file_cache[req.url] || (file_cache[req.url] = fs.readFileSync(dir + req.url));
    var matched = /<head[^>]*>/.exec(html);
    if (matched !== null) {
      html = html.slice(0,matched.index) +
        '<script src="/socket.io/socket.io.js"></script>' +
        '<script type="text/javascript" ' + 
        'src="/design_socket/socket_refresh.js"></script>' + 
        html.slice(matched.index+matched[0].length);
    }
    res.send(html).status(200);
  }
  app.get('/', handle_html);
  app.all('*.html', handle_html);
  app.use(express['static'](dir));
  io.sockets.on('connection', function (socket) {
    var refresh_event = function(file) {
      socket.emit("refresh", file);
    };
    RefreshEventer.on('refresh', refresh_event);
    socket.on('disconnect', function() {
      RefreshEventer.removeListener('refresh',refresh_event);
    });
  });

  server.listen(+options.port);
  console.log("Serving '" + dir + "' at http://localhost:" + options.port + "/");
};

