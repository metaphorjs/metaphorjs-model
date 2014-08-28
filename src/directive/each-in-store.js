

var registerAttributeHandler = require("../../../metaphorjs/src/func/directive/registerAttributeHandler.js"),
    defineClass = require("../../../metaphorjs-class/src/func/defineClass.js"),
    createGetter = require("../../../metaphorjs-watchable/src/func/createGetter.js"),
    createWatchable = require("../../../metaphorjs-watchable/src/func/createWatchable.js"),
    async = require("../../../metaphorjs/src/func/async.js");

require("../../../metaphorjs/src/directive/attr/each.js");

registerAttributeHandler("mjs-each-in-store", 100, defineClass(null, "attr.mjs-each", {

    store: null,

    initialize: function(scope, node, expr) {

        var self    = this,
            store;

        self.parseExpr(expr);

        node.removeAttribute("mjs-each-in-store");
        node.removeAttribute("mjs-include");

        self.tpl        = node;
        self.renderers  = [];
        self.prevEl     = node.previousSibling;
        self.nextEl     = node.nextSibling;
        self.parentEl   = node.parentNode;

        self.node       = node;
        self.scope      = scope;
        self.store      = store = createGetter(self.model)(scope);

        self.parentEl.removeChild(node);

        self.initWatcher();
        self.render(self.watcher.getValue());

        self.bindStore(store, "on");
    },

    onScopeDestroy: function() {

        var self    = this;

        self.bindStore(self.store, "un");
        delete self.store;

        self.supr();
    },

    initWatcher: function() {
        var self        = this;
        self.watcher    = createWatchable(self.store, ".items", null);
        self.watcher.subscribe(self.onChange, self);
    },

    resetWatcher: function() {
        var self        = this;
        self.watcher.setValue(self.store.items);
    },

    bindStore: function(store, fn) {

        var self    = this;

        store[fn]("load", self.onStoreUpdate, self);
        store[fn]("update", self.onStoreUpdate, self);
        store[fn]("add", self.onStoreUpdate, self);
        store[fn]("remove", self.onStoreUpdate, self);
        store[fn]("replace", self.onStoreUpdate, self);

        store[fn]("filter", self.onStoreFilter, self);
        store[fn]("clearfilter", self.onStoreFilter, self);

        store[fn]("clear", self.onStoreClear, self);

        store[fn]("destroy", self.onStoreDestroy, self);
    },

    onStoreUpdate: function() {
        this.watcher.check();
    },

    onStoreFilter: function() {
        this.resetWatcher();
        this.onStoreUpdate();
    },

    onStoreClear: function() {
        this.resetWatcher();
        this.onStoreUpdate();
    },

    onStoreDestroy: function() {
        var self = this;
        self.onStoreClear();
        self.watcher.unsubscribeAndDestroy(self.onChange, self);
        delete self.watcher;
    }

}, {
    $stopRenderer: true
}));
