
var defineClass = require("metaphorjs-class/src/func/defineClass.js");

require("metaphorjs/src/plugin/ListBuffered.js");

module.exports = defineClass({

    $class: "plugin.ListPullNext",
    $extends: "plugin.ListBuffered",

    buffered: false,

    $init: function(list, args) {

        var attrMap = list.attrMap,
            cfg = attrMap['modifier']['each'] ?
                    attrMap['modifier']['each'] : {};

        if (cfg.bufferedPullNext) {
            this.buffered = cfg.bufferedPullNext;
            list.buffered = true;
        }

        this.$super(list, args);
    },

    afterInit: function() {

        this.$super();
        this.getScrollOffset();
    },

    updateScrollBuffer: function(reset) {

        var self = this;

        if (self.buffered) {
            return self.$super(reset);
        }
        else {
            var prev    = self.bufferState,
                bs      = self.getBufferState(self.dynamicOffset);

            if (!prev || bs.first != prev.first || bs.last != prev.last) {
                self.list.trigger("buffer-change", self, bs, prev);
                self.onBufferStateChange(bs, prev);
            }
        }
    },

    onBufferStateChange: function(bs, prev) {

        var self = this,
            list = self.list,
            cnt = list.store.getLength();

        self.$super(bs, prev);

        if (cnt - bs.last < (bs.last - bs.first) / 3 && !list.store.loading && !list.store.$destroyed) {
            list.store.addNextPage();
            list.trigger("pull", self);
        }
    }


});