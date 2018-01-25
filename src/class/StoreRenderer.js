
var createGetter = require("metaphorjs-watchable/src/func/createGetter.js"),
    createWatchable = require("metaphorjs-watchable/src/func/createWatchable.js"),
    ns = require("metaphorjs-namespace/src/var/ns.js"),
    bind = require("metaphorjs/src/func/bind.js"),
    Store = require("./Store.js"),
    Directive = require("metaphorjs/src/class/Directive.js"),
    ListRenderer = require("metaphorjs/src/class/ListRenderer.js");


module.exports = (function(){

var StoreRenderer = ListRenderer.$extend({

        $class: "StoreRenderer",
        store: null,


        $constructor: function(scope, node, expr, parentRenderer, attrMap) {

            var cfg = attrMap['modifier']['each'] ?
                        attrMap['modifier']['each'] : {};

            if (cfg.pullNext) {
                if (cfg.buffered) {
                    cfg.bufferedPullNext = true;
                    cfg.buffered = false;
                }

                this.$plugins.push(
                    typeof cfg.pullNext === "string" ?
                        cfg.pullNext : "plugin.ListPullNext");
            }

            this.$super(scope, node, expr, parentRenderer, attrMap);
        },

        afterInit: function(scope, node, expr, parentRenderer, attrMap) {

            var self            = this,
                store;

            self.store          = store = createGetter(self.model)(scope);
            self.watcher        = createWatchable(store, ".current", self.onChange, self, {namespace: ns});
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
            if (self.watcher) {
                self.onStoreUpdate();
                self.watcher.unsubscribeAndDestroy(self.onChange, self);
                self.watcher = null;
            }
        },

        destroy: function() {
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

Directive.getDirective("attr", "each")
    .registerType(Store, StoreRenderer);


return StoreRenderer;
}());