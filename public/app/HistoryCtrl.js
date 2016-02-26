'use strict';
angular.module('FileSync').controller('HistoryCtrl', ['HistoryService', 'VisibilityService', 'SocketIOService', '$scope', '$timeout',
  function (HistoryService, VisibilityService, SocketIOService, $scope, $timeout) {
    this.edits = HistoryService.edits;
    this.visibility = VisibilityService;
    this.files = HistoryService.files;
    this.loadHistory = HistoryService.loadHistory;
    this.remove = function (edit) {
      HistoryService.remove(edit);
    };
  }
]);
