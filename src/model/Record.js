

const cls = require("metaphorjs-class/src/cls.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js"),
    extend  = require("metaphorjs-shared/src/func/extend.js"),
    isString = require("metaphorjs-shared/src/func/isString.js");

require("../__init.js");
require("./Model.js");
require("metaphorjs-observable/src/mixin/Observable.js");

/**
 * @class MetaphorJs.model.Record
 * @mixes MetaphorJs.mixin.Observable
 */
module.exports = MetaphorJs.model.Record = cls({

    /**
     * @event dirty-change {
     *  Record become changed on unchanged
     *  @param {MetaphorJs.model.Record} rec
     *  @param {boolean} dirty
     * }
     */
    /**
     * @event change {
     *  General record change event
     *  @param {MetaphorJs.model.Record} rec 
     *  @param {string} key
     *  @param {*} value 
     *  @param {*} prevValue
     * }
     */
    /**
     * @event change-_key_ {
     *  Specific key change event
     *  @param {MetaphorJs.model.Record} rec 
     *  @param {string} key
     *  @param {*} value 
     *  @param {*} prevValue
     * }
     */
    /**
     * @event before-load {
     *  @param {MetaphorJs.model.Record}
     * }
     */
    /**
     * @event load {
     *  @param {MetaphorJs.model.Record}
     * }
     */
    /**
     * @event failed-load {
     *  @param {MetaphorJs.model.Record}
     * }
     */
    /**
     * @event before-save {
     *  @param {MetaphorJs.model.Record}
     * }
     */
    /**
     * @event save {
     *  @param {MetaphorJs.model.Record}
     * }
     */
    /**
     * @event failed-save {
     *  @param {MetaphorJs.model.Record}
     * }
     */
    /**
     * @event before-delete {
     *  @param {MetaphorJs.model.Record}
     * }
     */
    /**
     * @event delete {
     *  @param {MetaphorJs.model.Record}
     * }
     */
    /**
     * @event failed-delete {
     *  @param {MetaphorJs.model.Record}
     * }
     */
    /**
     * @event reset {
     *  @param {MetaphorJs.model.Record}
     * }
     */


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
     * @param {object} cfg {
     *  @type {string|MetaphorJs.model.Model} model
     *  @type {boolean} autoLoad {
     *      Load record automatically when constructed
     *      @default true
     *  }
     *  @type {boolean} importUponSave {
     *      Import new data from response on save request
     *      @default false
     *  }
     *  @type {boolean} importUponCreate {
     *      Import new data from response on create request
     *      @default false
     *  }
     * }
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

        if (args === 1) {
            cfg     = id;
            id      = null;
            data    = null;
        }
        else if (args === 2) {
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

        if (self.$getClass() !== "MetaphorJs.model.Record") {
            MetaphorJs.model.Model.addToCache(self);
        }
    },

    /**
     * Is record finished loading from server
     * @method
     * @returns {bool}
     */
    isLoaded: function() {
        return this.loaded;
    },

    /**
     * Is record still loading from server
     * @method
     * @returns {bool}
     */
    isLoading: function() {
        return this.loading;
    },

    /**
     * Is this record was created separately from a store
     * @method
     * @returns {bool}
     */
    isStandalone: function() {
        return this.standalone;
    },

    /**
     * Does this record have changes
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
     * Make this record belong to a store
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
     * Remove attachment to a store. If record is not standalone,
     * it will be destroyed.
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
     * Mark this record as having changes
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
     * Import record data. Resets record to a unchanged state
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
     * Prepare data for sending to a server
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
     * Get record id
     * @method
     * @returns {*}
     */
    getId: function() {
        return this.id;
    },

    /**
     * Get record data. Returns a new object with all data keys 
     * or only the ones specified and without keys starting with $.
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
                if (i.substr(0, 1) === "$") {
                    continue;
                }
                data[i] = sdata[i];
            }

            return data;
        }
    },

    /**
     * Get changed properties
     * @method
     * @returns {object}
     */
    getChanged: function() {
        return extend({}, this.modified);
    },

    /**
     * Is the field changed
     * @method
     * @param {string} key
     * @returns {bool}
     */
    isChanged: function(key) {
        return this.modified[key] || false;
    },

    /**
     * Get specific data key
     * @method
     * @param {string} key
     * @returns {*}
     */
    get: function(key) {
        return this.data[key];
    },

    /**
     * Set record id
     * @method
     * @param {*} id
     */
    setId: function(id) {
        if (!this.id && id) {
            this.id = id;
        }
    },

    /**
     * Set data field
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
     * Revert record to the last saved state
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
     * Load record from the server
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
     * Send data back to server 
     * @method
     * @param {array|null|string} keys Only send these keys
     * @param {object|null} extra Send this data along with record data
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
     * Send delete request
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
     * Set record back to unloaded state
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

