
var defineClass = require("../../../metaphorjs-class/src/func/defineClass.js"),
    createGetter = require("../../../metaphorjs-watchable/src/func/createGetter.js"),
    createWatchable = require("../../../metaphorjs-watchable/src/func/createWatchable.js"),
    async = require("../../../metaphorjs/src/func/async.js"),
    ns = require("../../../metaphorjs-namespace/src/var/ns.js"),
    animate = require("../../../metaphorjs-animate/src/metaphorjs.animate.js"),
    bind = require("../../../metaphorjs/src/func/bind.js"),
    data = require("../../../metaphorjs/src/func/dom/data.js"),
    ListRenderer = require("../../../metaphorjs/src/class/ListRenderer.js"),
    addListener = require("../../../metaphorjs/src/func/event/addListener.js"),
    removeListener = require("../../../metaphorjs/src/func/event/removeListener.js"),
    removeAttr = require("../../../metaphorjs/src/func/dom/removeAttr.js"),
    getNodeConfig = require("../../../metaphorjs/src/func/dom/getNodeConfig.js");


module.exports = ListRenderer.$extend({

        store: null,

        $constructor: function(scope, node, expr) {


            var cfg = getNodeConfig(node, scope);

            if (cfg.pullNext) {
                if (cfg.buffered) {
                    cfg.bufferedPullNext = true;
                    cfg.buffered = false;
                }
                this.$plugins.push("ListPullNext");
            }

            this.$super(scope, node, expr);
        },

        afterInit: function(scope, node, expr) {

            var self            = this,
                store;

            self.store          = store = createGetter(self.model)(scope);
            self.watcher        = createWatchable(store, ".current", self.onChange, self, null, ns);
            self.trackByFn      = bind(store.getRecordId, store);
            self.griDelegate    = bind(store.indexOfId, store);
            self.bindStore(store, "on");
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

        destroy: function() {
            var self = this;
            self.bindStore(self.store, "un");
            self.$super();
        }

    },
    {
        $stopRenderer: true,
        $registerBy: "id"
    }
);

