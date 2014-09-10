
var defineClass = require("../../../metaphorjs-class/src/func/defineClass.js"),
    createGetter = require("../../../metaphorjs-watchable/src/func/createGetter.js"),
    createWatchable = require("../../../metaphorjs-watchable/src/func/createWatchable.js"),
    async = require("../../../metaphorjs/src/func/async.js"),
    ns = require("../../../metaphorjs-namespace/src/var/ns.js"),
    animate = require("../../../metaphorjs-animate/src/metaphorjs.animate.js"),
    bind = require("../../../metaphorjs/src/func/bind.js"),
    ListRenderer = require("../../../metaphorjs/src/view/ListRenderer.js");


module.exports = defineClass(
    null,
    ListRenderer,
    function(scope, node, expr) {


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

        self.animateMove    = node.getAttribute("mjs-animate-move") !== null && animate.cssAnimations;
        node.removeAttribute("mjs-animate-move");

        self.parentEl.removeChild(node);

        self.trackByFn      = bind(store.getRecordId, store);
        self.griDelegate    = bind(store.indexOfId, store);

        self.initWatcher();
        self.render(self.watcher.getValue());

        self.bindStore(store, "on");
    },
    {

        store: null,

        onScopeDestroy: function() {

            var self    = this;

            self.bindStore(self.store, "un");
            delete self.store;

            self.supr();
        },

        initWatcher: function() {
            var self        = this;
            self.watcher    = createWatchable(self.store, ".current", self.onChange, self, null, ns);
        },

        resetWatcher: function() {
            var self        = this;
            self.watcher.setValue(self.store.items);
        },

        bindStore: function(store, fn) {

            var self    = this;

            store[fn]("update", self.onStoreUpdate, self);
            store[fn]("clear", self.onStoreUpdate, self);
            store[fn]("destroy", self.onStoreDestroy, self);
        },

        onStoreUpdate: function() {
            this.watcher.check();
        },

        getListItem: function(list, index) {
            return this.store.getRecordData(list[index]);
        },

        onStoreDestroy: function() {
            var self = this;
            self.onStoreUpdate();
            self.watcher.unsubscribeAndDestroy(self.onChange, self);
            delete self.watcher;
        }

    },
    {
        $stopRenderer: true
    }
);



