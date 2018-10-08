

var cls = require("metaphorjs-class/src/cls.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js"),
    extend  = require("metaphorjs-shared/src/func/extend.js"),
    isString = require("metaphorjs-shared/src/func/isString.js");

require("../__init.js");
require("./Model.js");
require("metaphorjs-observable/src/mixin/Observable.js");

/**
 * @class MetaphorJs.model.Record
 */
module.exports = MetaphorJs.model.Record = cls({

    $mixins: [MetaphorJs.mixin.Observable],

    id:             null,
    data:           null,
    orig:           null,
    modified:       null,
    loaded:         false,
    loading:        false,
    dirty:          false,
    model:          null,
    standalone:     true,
    stores:         null,
    importUponSave: false,
    importUponCreate: false,

    /**
     * @constructor
     * @method $init
     * @param {*} id
     * @param {object} cfg
     */

    /**
     * @constructor
     * @method $init
     * @param {object} cfg
     */

    /**
     * @constructor
     * @method $init
     * @param {string|int|null} id
     * @param {object} data
     * @param {object} cfg
     */
    $init: function(id, data, cfg) {

        var self    = this,
            args    = arguments.length;

        if (args == 1) {
            cfg     = id;
            id      = null;
            data    = null;
        }
        else if (args == 2) {
            cfg     = data;
            data    = null;
        }

        self.data       = {};
        self.orig       = {};
        self.stores     = [];
        self.modified   = {};
        cfg             = cfg || {};
        self.$super(cfg);

        if (isString(self.model)) {
            self.model  = MetaphorJs.model.Model.create(self.model);
        }
        else if (!(self.model instanceof MetaphorJs.model.Model)) {
            self.model  = new MetaphorJs.model.Model(self.model);
        }

        self.id     = id;

        if (data) {
            self.importData(data);
        }
        else if(cfg.autoLoad !== false && id) {
            self.load();
        }

        if (self.$getClass() != "MetaphorJs.model.Record") {
            MetaphorJs.model.Model.addToCache(self);
        }
    },

    /**
     * @method
     * @returns {bool}
     */
    isLoaded: function() {
        return this.loaded;
    },

    /**
     * @method
     * @returns {bool}
     */
    isLoading: function() {
        return this.loading;
    },

    /**
     * @method
     * @returns {bool}
     */
    isStandalone: function() {
        return this.standalone;
    },

    /**
     * @method
     * @returns {bool}
     */
    isDirty: function() {
        return this.dirty;
    },

    /**
     * @method
     * @returns {MetaphorJs.model.Model}
     */
    getModel: function() {
        return this.model;
    },

    /**
     * @method
     * @param {MetaphorJs.model.Store} store
     */
    attachStore: function(store) {
        var self    = this,
            sid     = store.getId();

        if (self.stores.indexOf(sid) == -1) {
            self.stores.push(sid);
        }
    },

    /**
     * @method
     * @param {MetaphorJs.model.Store} store
     */
    detachStore: function(store) {
        var self    = this,
            sid     = store.getId(),
            inx;

        if (!self.$destroyed && (inx = self.stores.indexOf(sid)) != -1) {
            self.stores.splice(inx, 1);

            if (self.stores.length == 0 && !self.standalone) {
                self.$destroy();
            }
        }
    },

    /**
     * @method
     * @param {bool} dirty
     */
    setDirty: function(dirty) {
        var self    = this;
        if (self.dirty != dirty) {
            self.dirty  = !!dirty;
            self.trigger("dirty-change", self, dirty);
        }
    },

    /**
     * @method
     * @param {object} data
     */
    importData: function(data) {

        var self        = this,
            processed   = {},
            name;

        if (data) {
            for (name in data) {
                processed[name] = self.model.restoreField(self, name, data[name]);
            }

            self.data   = processed;
        }

        self.orig       = extend({}, self.data);
        self.modified   = {};
        self.loaded     = true;
        self.setDirty(false);
    },

    /**
     * @method
     * @access protected
     * @param {object} data
     * @returns {object}
     */
    storeData: function(data) {

        var self        = this,
            processed   = {},
            name;

        for (name in data) {
            processed[name] = self.model.storeField(self, name, data[name]);
        }

        return processed;
    },


    /**
     * @method
     * @returns {*}
     */
    getId: function() {
        return this.id;
    },

    /**
     * @method
     * @param {[]|null|string} keys
     * @returns {object}
     */
    getData: function(keys) {

        var data = {},
            i;

        if (keys) {
            var len,
                self    = this;

            keys = isString(keys) ? [keys] : keys;

            for (i = 0, len = keys.length; i < len; i++) {
                data[keys[i]] = self.data[keys[i]];
            }
            return data;
        }
        else {
            var sdata = this.data;

            for (i in sdata) {
                if (i.substr(0, 1) == "$") {
                    continue;
                }
                data[i] = sdata[i];
            }

            return data;
        }
    },

    /**
     * @method
     * @returns {object}
     */
    getChanged: function() {
        return extend({}, this.modified);
    },

    /**
     * @method
     * @param {string} key
     * @returns {bool}
     */
    isChanged: function(key) {
        return this.modified[key] || false;
    },

    /**
     * @method
     * @param {string} key
     * @returns {*}
     */
    get: function(key) {
        return this.data[key];
    },

    /**
     * @method
     * @param {*} id
     */
    setId: function(id) {
        if (!this.id && id) {
            this.id = id;
        }
    },

    /**
     * @method
     * @param {string} key
     * @param {*} value
     */
    set: function(key, value) {

        var self    = this,
            prev    = self.data[key];

        value           = self.model.restoreField(self, key, value);
        self.data[key]  = value;

        if (prev != value) {
            self.modified[key]  = true;
            self.setDirty(true);
            self.trigger("change", self, key, value, prev);
            self.trigger("change-"+key, self, key, value, prev);
        }
    },

    /**
     * @method
     */
    revert: function() {
        var self    = this;
        if (self.dirty) {
            self.data       = extend({}, self.orig);
            self.modified   = {};
            self.setDirty(false);
        }
    },

    /**
     * @method
     * @returns {MetaphorJs.lib.Promise}
     */
    load: function() {
        var self    = this;
        self.loading = true;
        self.trigger("before-load", self);
        return self.model.loadRecord(self.id)
            .always(function(){
                self.loading = false;
            })
            .done(function(response) {
                self.setId(response.id);
                self.importData(response.data);
                self.trigger("load", self);
            })
            .fail(function() {
                self.trigger("failed-load", self);
            });
    },

    /**
     * @method
     * @param {array|null|string} keys
     * @param {object|null} extra
     * @returns {MetaphorJs.lib.Promise}
     */
    save: function(keys, extra) {
        var self    = this;
        self.trigger("before-save", self);

        var create  = !self.getId(),
            imprt   = create ? self.importUponCreate : self.importUponSave;

        return self.model.saveRecord(self, keys, extra)
            .done(function(response) {
                if (response.id) {
                    self.setId(response.id);
                }
                if (imprt) {
                    self.importData(response.data);
                }
                self.trigger("save", self);
            })
            .fail(function(response) {
                self.trigger("failed-save", self);
            });
    },

    /**
     * @method
     * @returns {MetaphorJs.lib.Promise}
     */
    "delete": function() {
        var self    = this;
        self.trigger("before-delete", self);
        return self.model.deleteRecord(self)
            .done(function() {
                self.trigger("delete", self);
                self.$destroy();
            }).
            fail(function() {
                self.trigger("failed-delete", self);
            });
    },


    /**
     * @method
     */
    reset: function() {

        var self        = this;

        self.id         = null;
        self.data       = {};
        self.orig       = {};
        self.modified   = {};
        self.loaded     = false;
        self.dirty      = false;

        self.trigger("reset", self);
    },



    onDestroy: function() {

        var self    = this;
        MetaphorJs.model.Model.removeFromCache(self.$getClass(), self.id);
        self.$super();
    }

});

