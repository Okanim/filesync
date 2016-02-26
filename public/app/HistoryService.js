'use strict';
angular.module('FileSync')
  .factory('HistoryService', function (SocketIOService, _) {
    var edits = [];
    var files = [];
    var history = [];
    var current;
    var _callback;

    SocketIOService.onFileChanged(function (filename, timestamp, content) {
      if(!history[filename]){
        files.push(filename);
        history[filename] = new Array();
      }
      if(current === filename || !current){
        edits.unshift({filename: filename, timestamp: timestamp, content: content});
      }
      history[filename].unshift({filename: filename, timestamp: timestamp, content: content});
    });
    SocketIOService.onHistoryInit(function(historyR){
      angular.copy(Object.keys(historyR),files);
      history = historyR;
    });

    return {
      edits: edits,
      files : files,
      onUpdateFiles: function(f){
        _callback = f;
      },
      remove: function (edit) {
        _.remove(edits, edit);
      },
      loadHistory: function(filename){
        current = filename;
        angular.copy(history[filename],edits);
      },
    };
  });
