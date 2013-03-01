var express = require('express');
var app = express(), 
  http = require('http'), 
  server = http.createServer(app);
var io = require('socket.io').listen(server, {
  'log level': 0
});
var events = require('events');
var util = require('util');
var fs = require('fs');
var options = {
  dir : null,
  port : "3000"
};
var css_files = {
};
app.engine('html', function (path, options, fn){
  var key = path + ':string';

  if ('function' == typeof options) {
    fn = options, options = {};
  }

  try {
    options.filename = path;
    var str = options.cache ? exports.cache[key] || 
      (exports.cache[key] = fs.readFileSync(path, 'utf8'))
    : fs.readFileSync(path, 'utf8');
    fn(null,str);
  } catch (err) {
    fn(err);
  }
});
var RefreshEventer = function(){
  events.EventEmitter.call(this);
  this.refresh_file = function(file) {
    this.emit("refresh", file);
  };
};
util.inherits(RefreshEventer, events.EventEmitter);
RefreshEventer = new RefreshEventer();

process.argv.forEach(function (val, index, array) {
  if (index === 2) {
    options.dir = val;
  } else if (index === 3) {
    options.port = val;
  }
});
if (options.dir === null) {
  return;
}
app.use(function(req, res, next) {
  if (req.url.match(/\.css/) !== null) {
    if (req.url.indexOf(".css?") !== -1) {
      req.url = req.url.substr(0,req.url.indexOf(".css?") + 4);
    }
    if (!options[req.url]) {
      options[req.url] = true;
      fs.watchFile(options.dir + req.url, { 
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
app.set('views', options.dir );
app.use('/design_socket',express['static'](__dirname + "/design_socket"));
function handle_html(req, res) {
  if (req.url === '/') {
    req.url = '/index.html';
  }
  res.render(req.url.substr(1), function(err, html) {
    var matched = html.match(/<head[^>]*>/);
    if (matched !== null) {
      html = html.slice(0,matched.index) +
        '<script src="/socket.io/socket.io.js"></script>' +
        '<script type="text/javascript" ' + 
        'src="/design_socket/socket_refresh.js"></script>' + 
        html.slice(matched.index+matched[0].length);
    }
    res.send(html).status(200);
  });
}
app.all('/', handle_html);
app.all('*.html', handle_html);
app.use(express['static'](options.dir));
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
