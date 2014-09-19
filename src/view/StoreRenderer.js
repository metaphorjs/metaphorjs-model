
var defineClass = require("../../../metaphorjs-class/src/func/defineClass.js"),
    createGetter = require("../../../metaphorjs-watchable/src/func/createGetter.js"),
    createWatchable = require("../../../metaphorjs-watchable/src/func/createWatchable.js"),
    async = require("../../../metaphorjs/src/func/async.js"),
    ns = require("../../../metaphorjs-namespace/src/var/ns.js"),
    animate = require("../../../metaphorjs-animate/src/metaphorjs.animate.js"),
    bind = require("../../../metaphorjs/src/func/bind.js"),
    data = require("../../../metaphorjs/src/func/dom/data.js"),
    ListRenderer = require("../../../metaphorjs/src/view/ListRenderer.js"),
    addListener = require("../../../metaphorjs/src/func/event/addListener.js"),
    removeListener = require("../../../metaphorjs/src/func/event/removeListener.js"),
    removeAttr = require("../../../metaphorjs/src/func/dom/removeAttr.js"),
    getNodeConfig = require("../../../metaphorjs/src/func/dom/getNodeConfig.js");


var StoreRenderer = ListRenderer.$extend({

        store: null,
        pullNext: false,
        pullNextDelegate: null,

        init: function(scope, node, expr) {
            var self            = this,
                store;

            self.store          = store = createGetter(self.model)(scope);
            self.watcher        = createWatchable(store, ".current", self.onChange, self, null, ns);
            self.trackByFn      = bind(store.getRecordId, store);
            self.griDelegate    = bind(store.indexOfId, store);
            self.bindStore(store, "on");

            var cfg = getNodeConfig(node, scope);
            if (!cfg.buffered && cfg.pullNext) {
                self.initPullNext(cfg);
            }
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
            self.watcher = null;
        },


        initBuffering: function(cfg) {
            var self = this;
            self.supr(cfg);

            self.pullNext = cfg.pullNext || false;
        },

        initPullNext: function(cfg) {
            var self = this;
            self.pullNext = true;
            self.itemSize = cfg.itemSize;
            self.initScrollParent();
            self.getScrollOffset();
            self.pullNextDelegate = bind(self.pullNextEvent, self);
            addListener(self.scrollEl, "scroll", self.pullNextDelegate);
            addListener(window, "resize", self.pullNextDelegate);
        },

        pullNextEvent: function() {
            var self = this;
            self.queue.append(self.updateStoreOnScroll, self);
        },

        updateStoreOnScroll: function() {
            var self    = this,
                prev    = self.bufferState,
                bs      = self.getBufferState(),
                cnt     = self.store.getLength();

            if (!prev || bs.first != prev.first || bs.last != prev.last) {
                self.triggerIf("bufferchange", self, bs, prev);
            }

            if (cnt - bs.last < (bs.last - bs.first) / 3 && !self.store.loading) {
                self.store.addNextPage();
                self.triggerIf("pull", self);
            }
        },

        onBufferStateChange: function(bs, prev) {

            var self = this,
                cnt = self.store.getLength();

            self.supr(bs, prev);

            if (self.pullNext && cnt - bs.last < (bs.last - bs.first) / 3 && !self.store.loading) {
                self.store.addNextPage();
                self.triggerIf("pull", self);
            }
        },


        destroy: function() {
            var self = this;
            self.bindStore(self.store, "un");
            self.store = null;

            if (self.pullNext && !self.buffered) {
                removeListener(self.scrollEl, "scroll", self.pullNextDelegate);
                removeListener(window, "resize", self.pullNextDelegate);
            }

            self.pullNextDelegate = null;

            self.supr();
        }

    },
    {
        $stopRenderer: true,
        $registerBy: "id"
    }
);


module.exports = StoreRenderer;