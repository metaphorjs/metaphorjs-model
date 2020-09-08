

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

        let args    = arguments.length;

        if (args === 1) {
            cfg     = id;
            id      = null;
            data    = null;
        }
        else if (args === 2) {
            cfg     = data;
            data    = null;
        }

        this.data       = {};
        this.orig       = {};
        this.stores     = [];
        this.modified   = {};
        cfg             = cfg || {};
        this.$super(cfg);

        if (isString(this.model)) {
            this.model  = MetaphorJs.model.Model.create(this.model);
        }
        else if (!(this.model instanceof MetaphorJs.model.Model)) {
            this.model  = new MetaphorJs.model.Model(this.model);
        }

        this.id     = id;

        if (data) {
            this.importData(data);
        }
        else if(cfg.autoLoad !== false && id) {
            this.load();
        }

        if (this.$getClass() !== "MetaphorJs.model.Record") {
            MetaphorJs.model.Model.addToCache(this);
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
        let sid = store.getId();

        if (this.stores.indexOf(sid) == -1) {
            this.stores.push(sid);
        }
    },

    /**
     * Remove attachment to a store. If record is not standalone,
     * it will be destroyed.
     * @method
     * @param {MetaphorJs.model.Store} store
     */
    detachStore: function(store) {
        var sid     = store.getId(),
            inx;

        if (!this.$destroyed && (inx = this.stores.indexOf(sid)) != -1) {
            this.stores.splice(inx, 1);

            if (this.stores.length == 0 && !this.standalone) {
                this.$destroy();
            }
        }
    },

    /**
     * Mark this record as having changes
     * @method
     * @param {bool} dirty
     */
    setDirty: function(dirty) {
        if (this.dirty != dirty) {
            this.dirty  = !!dirty;
            this.trigger("dirty-change", this, dirty);
        }
    },

    /**
     * Import record data. Resets record to a unchanged state
     * @method
     * @param {object} data
     */
    importData: function(data) {

        let processed   = {},
            name;

        if (data) {
            for (name in data) {
                processed[name] = this.model.restoreField(this, name, data[name]);
            }

            this.data   = processed;
        }

        this.orig       = extend({}, this.data);
        this.modified   = {};
        this.loaded     = true;
        this.setDirty(false);
    },

    /**
     * Prepare data for sending to a server
     * @method
     * @access protected
     * @param {object} data
     * @returns {object}
     */
    storeData: function(data) {

        let processed   = {},
            name;

        for (name in data) {
            processed[name] = this.model.storeField(this, name, data[name]);
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

        let data = {},
            i;

        if (keys) {
            let len;

            keys = isString(keys) ? [keys] : keys;

            for (i = 0, len = keys.length; i < len; i++) {
                data[keys[i]] = this.data[keys[i]];
            }
            return data;
        }
        else {
            let sdata = this.data;

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

        let prev = this.data[key];

        value           = this.model.restoreField(this, key, value);
        this.data[key]  = value;

        if (prev != value) {
            this.modified[key]  = true;
            this.setDirty(true);
            this.trigger("change", this, key, value, prev);
            this.trigger("change-"+key, this, key, value, prev);
        }
    },

    /**
     * Revert record to the last saved state
     * @method
     */
    revert: function() {
        if (this.dirty) {
            this.data       = extend({}, this.orig);
            this.modified   = {};
            this.setDirty(false);
        }
    },

    /**
     * Load record from the server
     * @method
     * @returns {MetaphorJs.lib.Promise}
     */
    load: function() {
        this.loading = true;
        this.trigger("before-load", this);
        return this.model.loadRecord(this.id)
            .always(() => {
                this.loading = false;
            })
            .done((response) => {
                this.setId(response.id);
                this.importData(response.data);
                this.trigger("load", this);
            })
            .fail(() => {
                this.trigger("failed-load", this);
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
        this.trigger("before-save", this);

        let create  = !this.getId(),
            imprt   = create ? this.importUponCreate : this.importUponSave;

        return this.model.saveRecord(this, keys, extra)
            .done((response) => {
                if (response.id) {
                    this.setId(response.id);
                }
                if (imprt) {
                    this.importData(response.data);
                }
                this.trigger("save", this);
            })
            .fail(() => this.trigger("failed-save", this));
    },

    /**
     * Send delete request
     * @method
     * @returns {MetaphorJs.lib.Promise}
     */
    "delete": function() {
        this.trigger("before-delete", this);
        return this.model.deleteRecord(this)
            .done(() => {
                this.trigger("delete", this);
                this.$destroy();
            }).
            fail(() => {
                this.trigger("failed-delete", this);
            });
    },


    /**
     * Set record back to unloaded state
     * @method
     */
    reset: function() {

        this.id         = null;
        this.data       = {};
        this.orig       = {};
        this.modified   = {};
        this.loaded     = false;
        this.dirty      = false;

        this.trigger("reset", this);
    },



    onDestroy: function() {
        MetaphorJs.model.Model.removeFromCache(this.$getClass(), this.id);
        this.$super();
    }

});

