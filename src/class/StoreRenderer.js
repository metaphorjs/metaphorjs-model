
var createGetter = require("metaphorjs-watchable/src/func/createGetter.js"),
    createWatchable = require("metaphorjs-watchable/src/func/createWatchable.js"),
    bind = require("metaphorjs/src/func/bind.js"),
    filterLookup = require("metaphorjs/src/func/filterLookup.js"),
    ListRenderer = require("metaphorjs/src/class/ListRenderer.js");

module.exports = ListRenderer.$extend({

    $class: "MetaphorJs.model.StoreRenderer",
    store: null,

    $constructor: function(scope, node, expr, parentRenderer, attr) {

        var cfg = attr ? attr.config : {};

        if (cfg.pullNext) {
            if (cfg.buffered) {
                cfg.bufferedPullNext = true;
                cfg.buffered = false;
            }

            this.$plugins.push(
                typeof cfg.pullNext === "string" ?
                    cfg.pullNext : "MetaphorJs.plugin.ListPullNext");
        }

        this.$super(scope, node, expr, parentRenderer, attr);
    },

    afterInit: function(scope, node, expr, parentRenderer, attr) {

        var self            = this,
            store;

        self.store          = store = createGetter(self.model)(scope);
        self.watcher        = createWatchable(store, ".current", self.onChange, self, {filterLookup: filterLookup});
        
        if (self.trackByFn !== false) {
            self.trackByFn      = bind(store.getRecordId, store);
        }
        
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
        if (self.watcher) {
            self.onStoreUpdate();
            self.watcher.unsubscribeAndDestroy(self.onChange, self);
            self.watcher = null;
        }
    },

    onDestroy: function() {
        var self = this;
        if (!self.store.$destroyed) {
            self.bindStore(self.store, "un");
        }
        self.$super();
    }

},
{
    $stopRenderer: true,
    $registerBy: "id"
}
);


