'use strict';

var io = require('socket.io');
var express = require('express');
var path = require('path');
var app = express();
var _ = require('lodash');
var fs = require('fs');

var logger = require('winston');
var config = require('./config')(logger);

app.use(express.static(path.resolve(__dirname, './public')));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

var server = app.listen(config.server.port, function() {
  logger.info('Server listening on %s', config.server.port);
});

var history;

fs.readFile('history.json', 'utf8', function(err, content){
  if(err) {
    fs.writeFileSync('history.json', JSON.stringify({}));
    history = new Object();
  } else {
    if(content == ""){
      history = new Object();
    } else {
      history = JSON.parse(content);
    }
  }
})

var sio = io(server);

sio.set('authorization', function(handshakeData, accept) {
  // @todo use something else than a private `query`
  handshakeData.isAdmin = handshakeData._query.access_token === config.auth.token;
  accept(null, true);
});

function Viewers(sio) {
  var data = [];

  function notifyChanges() {
    sio.emit('viewers:updated', data);
  }

  return {
    add: function add(nickname) {
      data.push(nickname);
      notifyChanges();
    },
    remove: function remove(nickname) {
      var idx = data.indexOf(nickname);
      if (idx > -1) {
        data.splice(idx, 1);
      }
      notifyChanges();
      console.log('-->', data);
    }
  };
}

var viewers = Viewers(sio);


// @todo extract in its own
sio.on('connection', function(socket) {
    console.log(Object.keys(history).length);
  if(Object.keys(history).length > 0){
    sio.emit('history:init', history);
  }
  // console.log('nouvelle connexion', socket.id);
  socket.on('viewer:new', function(nickname) {
    socket.nickname = nickname;
    viewers.add(nickname);
    console.log('new viewer with nickname %s', nickname, viewers);
  });

  socket.on('disconnect', function() {
    viewers.remove(socket.nickname);
    console.log('viewer disconnected %s\nremaining:', socket.nickname, viewers);
  });

  socket.on('file:changed', function() {
    if (!socket.conn.request.isAdmin) {
      // if the user is not admin
      // skip this
      return socket.emit('error:auth', 'Unauthorized :)');
    }
      var obj = {"timestamp" : arguments[1], "content": arguments[2]};
      if(!history[arguments[0]]){
        history[arguments[0]] = new Array();
      }
      history[arguments[0]].unshift(obj);
      fs.writeFile('history.json', JSON.stringify(history), function(err){
        if(err) console.log(err);
      });
    // forward the event to everyone
    sio.emit.apply(sio, ['file:changed'].concat(_.toArray(arguments)));
  });

  socket.visibility = 'visible';

  socket.on('user-visibility:changed', function(state) {
    socket.visibility = state;
    sio.emit('users:visibility-states', getVisibilityCounts());
  });
});

function getVisibilityCounts() {
  return _.chain(sio.sockets.sockets).values().countBy('visibility').value();
}
