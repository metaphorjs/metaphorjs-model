
var defineClass = require("../../metaphorjs-class/src/func/defineClass.js"),
    bind = require("../../metaphorjs/src/func/bind.js"),
    isString = require("../../metaphorjs/src/func/isString.js"),
    emptyFn = require("../../metaphorjs/src/func/emptyFn.js");

require("./Store.js");

defineClass("MetaphorJs.data.FirebaseStore", "MetaphorJs.data.Store", {

    firebase: null,

    initialize: function(ref) {

        var self    = this;

        self.firebase = isString(ref) ? new Firebase(ref) : ref;

        self.firebase.on("child_added", bind(self.onChildAdded, self));
        self.firebase.on("child_removed", bind(self.onChildRemoved, self));
        self.firebase.on("child_changed", bind(self.onChildChanged, self));
        self.firebase.on("child_moved", bind(self.onChildMoved, self));

        self.supr();
    },

    initModel: emptyFn,

    ref: function() {
        return this.firebase.ref ?
                this.firebase.ref() :
                this.firebase;
    },

    load: function() {
        var self = this;
        if (!self.loaded) {
            self.firebase.once("value", bind(self.onSnapshotLoaded, self));
        }
    },

    onSnapshotLoaded: function(recordsSnapshot) {

        var self = this;

        recordsSnapshot.forEach(function(snapshot) {
            self.add(snapshot, true, true);
        });

        self.update();
        self.loaded = true;
        self.trigger("load", self);
    },

    onChildAdded: function(snapshot, prevName) {
        var self = this;
        if (self.loaded) {
            var index = self.indexOfId(prevName, true);
            self.insert(index + 1, snapshot);
        }
    },

    onChildRemoved: function(snapshot) {
        var self = this;
        if (self.loaded) {
            self.removeId(snapshot.name());
        }
    },

    onChildChanged: function(snapshot, prevName) {
        var self = this;
        if (self.loaded) {
            var old = self.getById(snapshot.name(), true);
            self.replace(old, snapshot);
        }
    },

    onChildMoved: function(snapshot, prevName) {
        // not yet implemented
    },

    getRecordId: function(item) {
        return item.name();
    },

    getRecordData: function(item) {
        return item.val();
    },

    processRawDataItem: function(item) {
        return item;
    },

    bindRecord: emptyFn


});