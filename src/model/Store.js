
const extend  = require("metaphorjs-shared/src/func/extend.js"),
    emptyFn = require("metaphorjs-shared/src/func/emptyFn.js"),
    isArray = require("metaphorjs-shared/src/func/isArray.js"),
    cls = require("metaphorjs-class/src/cls.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js"),
    isString = require("metaphorjs-shared/src/func/isString.js"),
    nextUid = require("metaphorjs-shared/src/func/nextUid.js"),
    filterArray = require("metaphorjs-shared/src/func/filterArray.js"),
    sortArray = require("metaphorjs-shared/src/func/sortArray.js");
    
require("../__init.js");
require("./Model.js");
require("./Record.js");    
require("metaphorjs-observable/src/mixin/Observable.js");

module.exports = MetaphorJs.model.Store = function(){

    const allStores   = {};

    /**
     * @class MetaphorJs.model.Store
     * @mixes MetaphorJs.mixin.Observable
     */
    return cls({

        /**
         * @event update {
         *  Store contents got updated
         *  @param {MetaphorJs.model.Store} store
         *  @param {MetaphorJs.model.Record|object} rec
         * }
         */
        /**
         * @event before-load {
         *  Before store sends a get request to the server
         *  @param {MetaphorJs.model.Store} store
         *  @returns {boolean} return false to cancel laoding
         * }
         */
        /**
         * @event load {
         *  After store finished loading and updating its contents
         *  @param {MetaphorJs.model.Store} store
         * }
         */
        /**
         * @event loading-end {
         *  After store finished loading but before updating.<br>
         *  This event does not respect <code>silent</code> option. 
         *  The purpose of this event is to let you 
         *  display loading indicator or something like that.
         *  @param {MetaphorJs.model.Store} store
         * }
         */
        /**
         * @event loading-start {
         *  The store requested the server.<br>
         *  This event does not respect <code>silent</code> option. 
         *  The purpose of this event is to let you 
         *  display loading indicator or something like that.
         *  @param {MetaphorJs.model.Store} store
         * }
         */
        /**
         * @event failed-load {
         *  There was an error while loading
         *  @param {MetaphorJs.model.Store} store
         *  @param {string|Error} reason
         * }
         */
        /**
         * @event before-save {
         *  Before sending "save" request
         *  @param {MetaphorJs.model.Store} store
         *  @param {array} recs
         *  @returns {boolean} return false to cancel saving
         * }
         */
        /**
         * @event save {
         *  Records have been saved
         *  @param {MetaphorJs.model.Store} store
         * }
         */
        /**
         * @event failed-save {
         *  There was an error while saving
         *  @param {MetaphorJs.model.Store} store
         *  @param {string|Error} reason
         * }
         */
        /**
         * @event before-delete {
         *  Before sending "delete" request
         *  @param {MetaphorJs.model.Store} store
         *  @param {array} ids 
         *  @returns {boolean} return false to cancel deletion
         * }
         */
        /**
         * @event delete {
         *  Records have been deleted
         *  @param {MetaphorJs.model.Store} store
         *  @param {array} ids 
         * }
         */
        /**
         * @event failed-delete {
         *  There was an error while deleting
         *  @param {MetaphorJs.model.Store} store
         *  @param {array} ids 
         * }
         */
        /**
         * @event add {
         *  Some records were added to the store
         *  @param {MetaphorJs.model.Store} store
         *  @param {array} recs 
         * }
         */
        /**
         * @event remove {
         *  Record got removed from the store
         *  @param {MetaphorJs.model.Store} store
         *  @param {MetaphorJs.model.Record|object} rec
         *  @param {string|int} id 
         * }
         */
        /**
         * @event replace {
         *  A record was replaced
         *  @param {MetaphorJs.model.Store} store
         *  @param {MetaphorJs.model.Record|object} old
         *  @param {MetaphorJs.model.Record|object} rec
         * }
         */
        /**
         * @event clear {
         *  The store has been cleared
         *  @param {MetaphorJs.model.Store} store
         *  @param {array} recs
         * }
         */

            $mixins:        [MetaphorJs.mixin.Observable],

            id:             null,
            autoLoad:       false,
            clearOnLoad:    true,
            model:          null,

            extraParams:    null,
            loaded:         false,
            loading:        false,
            local:          false,

            items:          null,
            current:        null,
            itemMap:        null,
            currentMap:     null,

            length:         0,
            currentLength:  0,
            maxLength:      0,
            totalLength:    0,

            start:          0,
            pageSize:       null,
            pages:          null,
            filtered:       false,
            sorted:         false,
            filterBy:       null,
            filterOpt:      null,
            sortBy:         null,
            sortDir:        null,
            publicStore:    false,

            idProp:         null,
            loadingPromise: null,

            /**
             * @constructor
             * @method $init
             * @param {object} options {
             *  @type {string} url Api endpoint url if not defined in model
             *  @type {boolean} local {
             *      This store does not load data from remote server
             *      @default false
             *  }
             *  @type {int} pageSize Number of records per page
             *  @type {boolean} autoLoad {
             *      @default false
             *  }
             *  @type {boolean} clearOnLoad {
             *      On load, remove everything already added 
             *      @default true
             *  }
             *  @type {string|object|MetaphorJs.model.Model} model
             *  @type {object} extraParams {
             *      Extra params to add to every request
             *  }
             *  @type {MetaphorJs.model.Store} sourceStore {
             *      Keep in sync with another store
             *  }
             * }
             * @param {array} initialData Array of records
             */

            /**
             * @constructor
             * @method $init
             * @param {string} url
             * @param {object} options
             * @param {array} initialData
             */
            $init:     function(url, options, initialData) {

                this.items          = [];
                this.current        = [];
                this.itemMap        = {};
                this.currentMap     = {};
                this.loaded         = false;
                this.extraParams    = this.extraParams || {};

                if (url && !isString(url)) {
                    initialData = options;
                    options     = url;
                    url         = null;
                }

                options         = options || {};

                if (url) {
                    options.url = url;
                }

                this.$super(options);
                extend(this, options, true, false);

                this.id         = this.id || nextUid();
                this.filtered   = !!this.filterBy;
                
                if (this.publicStore) {
                    allStores[this.id]  = this;
                }

                this.initModel(options);

                this.$$observable.createEvent("beforeload", false);

                if (!this.local && this.autoLoad) {
                    this.load();
                }
                else if (initialData) {
                    if (isArray(initialData)) {
                        this._loadArray(initialData);
                    }
                    else {
                        this._fetchData(initialData);
                    }
                }

                if (this.local) {
                    this.loaded     = true;
                }

                if (this.sourceStore) {
                    this.initSourceStore(this.sourceStore, "on");
                }
            },

            /**
             * Change store's model
             * @param {MetaphorJs.model.Model} model 
             */
            setModel: function(model) {
                this.model = model;
                this.initModel({});
            },

            initModel: function(options) {

                if (isString(this.model)) {
                    this.model  = MetaphorJs.model.Model.create(this.model);
                }
                else if (!(this.model instanceof MetaphorJs.model.Model)) {
                    this.model  = new MetaphorJs.model.Model(this.model);
                }

                if (options.url) {
                    this.model.store.load = options.url;
                }

                this.idProp = this.model.getStoreProp("load", "id");
            },


            initSourceStore: function(sourceStore, mode) {
                sourceStore[mode]("update", this.onSourceStoreUpdate, this);
            },

            onSourceStoreUpdate: function() {

                this.$$observable.suspendAllEvents();

                this.clear();
                this.addMany(this.sourceStore.toArray());

                this.$$observable.resumeAllEvents();
                this.trigger("update", this);
            },

            /**
             * Get store id
             * @method
             * @returns {string}
             */
            getId: function() {
                return this.id;
            },

            /**
             * Is this store finished loading data
             * @method
             * @returns {bool}
             */
            isLoaded: function() {
                return this.loaded;
            },

            /**
             * Is this store local (does not load remote data)
             * @method
             * @returns {bool}
             */
            isLocal: function() {
                return this.local;
            },

            /**
             * Make this store local or remote
             * @method
             * @param {bool} state
             */
            setLocal: function(state) {
                this.local  = !!state;
            },

            /**
             * Is this store currently loading
             * @method
             * @returns {bool}
             */
            isLoading: function() {
                return this.loading;
            },

            /**
             * Does this store have a filter applied
             * @method
             * @returns {bool}
             */
            isFiltered: function() {
                return this.filtered;
            },

            /**
             * Does this store have a sorter applied
             * @method
             * @returns {bool}
             */
            isSorted: function() {
                return this.sorted;
            },

            /**
             * Get number of records in this store
             * @method
             * @param {boolean} unfiltered
             * @returns {number}
             */
            getLength: function(unfiltered) {
                return unfiltered ? this.length : this.currentLength;
            },

            /**
             * Get number of records on the server
             * @method
             * @returns {number}
             */
            getTotalLength: function() {
                return this.totalLength || this.currentLength;
            },

            /**
             * Is this store currently empty
             * @method
             * @param {boolean} unfiltered
             * @returns {boolean}
             */
            isEmpty: function(unfiltered) {
                return unfiltered ? this.length === 0 : this.currentLength === 0;
            },

            /**
             * Get number of pages (based on pageSize setting)
             * @method
             * @returns {number}
             */
            getPagesCount: function() {
                if (this.pageSize !== null) {
                    return parseInt(this.totalLength / this.pageSize);
                }
                else {
                    return 1;
                }
            },

            /**
             * Set extra param. It will be sent along with every request
             * @method
             * @param {string} k
             * @param {string|int|null} v
             */
            setParam: function(k, v) {
                if (v === null) {
                    delete this.extraParams[k];
                }
                else {
                    this.extraParams[k] = v;
                }
            },

            /**
             * Get extra param
             * @method
             * @param {string} k
             * @returns {*}
             */
            getParam: function(k) {
                return this.extraParams[k];
            },

            /**
             * Get all extra params (in a new object)
             * @method
             * @returns {object}
             */
            getParams: function() {
                return extend({}, this.extraParams);
            },

            /**
             * Clear all extra params
             * @method
             */
            clearParams: function() {
                this.extraParams = {};
            },

            /**
             * Set remote record offset
             * @method
             * @param {number} val
             */
            setStart: function(val) {
                this.start = val;
            },

            /**
             * Set page size
             * @method
             * @param {number} val
             */
            setPageSize: function(val) {
                this.pageSize = val;
            },

            /**
             * Get unprocessed response data
             * @method
             * @returns {object}
             */
            getFetchedData: function() {
                return this.fetchedData;
            },

            /**
             * Does this store have records marked as dirty
             * @method
             * @param {boolean} unfiltered If filter is appied this flag will 
             *  make this method ignore the filter
             * @returns {bool}
             */
            hasDirty: function(unfiltered) {
                if (this.model.isPlain()) {
                    return false;
                }
                let ret = false;
                this.each(function(rec){
                    if (rec.isDirty()) {
                        ret = true;
                        return false;
                    }
                    return true;
                }, null, unfiltered);
                return ret;
            },

            /**
             * Get list of records marked as dirty
             * @method
             * @param {boolean} unfiltered If filter is appied this flag will 
             *  make this method ignore the filter
             * @returns {array}
             */
            getDirty: function(unfiltered) {
                let recs    = [];
                if (this.model.isPlain()) {
                    return recs;
                }
                this.each(function(rec){
                    if (rec.isDirty()) {
                        recs.push(rec);
                    }
                }, null, unfiltered);
                return recs;
            },

            /**
             * Get current model
             * @method
             * @returns {MetaphorJs.model.Model}
             */
            getModel: function() {
                return this.model;
            },


            /**
             * Get list of records (affected by store filter)
             * @method
             * @returns {array}
             */
            toArray: function() {
                return this.current.slice();
            },



            /**
             * @ignore
             * initialize store with data from remote sever
             * @method
             * @param {object} data
             */
            _fetchData: function(data, options) {

                options = options || {};

                if (!options.silent && this.trigger("before-load", this) === false) {
                    return;
                }

                this.fetchedData = data;

                this.model._processStoreResponse("load", data, {
                    resolve: (response) => {
                        this._onModelLoadSuccess(response, options);
                    },
                    reject: (reason) => {
                        this._onModelLoadFail(reason, options);
                    }
                });
            },

            /**
             * @ignore
             * initialize store with local data
             * @param {[]} recs
             * @param {{}} options
             */
            _loadArray: function(recs, options) {

                options = options || {};

                if (!options.silent && this.trigger("before-load", this) === false) {
                    return;
                }

                if (isArray(recs)) {
                    this._load(recs, options);
                    this.totalLength = this.length;
                }
            },



            /**
             * @ignore
             * load records no matter where they came from
             * @param {[]} recs
             * @param {{}} options
             */
            _load: function(recs, options) {

                const prepend = options.prepend;

                options = options || {};
                recs = recs || [];

                if (prepend) {
                    this.insertMany(0, recs, true, true)
                }
                else {
                    this.addMany(recs, true, true);
                }

                this.loaded     = true;
                this.loading    = false;

                this.trigger("loading-end", this);
                this.onLoad();

                if (!options.skipUpdate) {
                    this.update();
                }

                if (!options.silent) {
                    this.trigger("load", this);
                }
            },

            /**
             * (Re)load store. 
             * @method
             * @param {object} params {
             *  Add these params to load request
             *  @optional
             * }
             * @param {object} options {
             *  @type {boolean} silent {
             *      Do not trigger events
             *      @default false
             *  }
             *  @type {boolean} noopOnEmpty {
             *      Stop doing anything as soon as we know the data is empty
             *      (do not clear and update)
             *      @default false
             *  }
             *  @type {boolean} prepend {
             *      Insert loaded data in front of old ones (and do not clear)
             *      @default false
             *  }
             *  @type {boolean} append {
             *      Insert loaded data after existing records (and do not clear)
             *      @default false
             *  }
             *  @type {boolean} skipUpdate {
             *      Skip updating store - re-filter, re-map
             *      @default false
             *  }
             * }
             * @returns {MetaphorJs.lib.Promise}
             */
            load: function(params, options) {

                const ms      = this.model.store,
                      sp      = ms.start,
                      lp      = ms.limit,
                      ps      = this.pageSize;

                if (this.loadingPromise && this.loadingPromise.abort) {
                    this.loadingPromise.abort();
                }

                options     = options || {};

                if (this.local) {
                    return null;
                }

                params      = extend({}, this.extraParams, params || {});

                if (ps !== null && !params[sp] && !params[lp]) {
                    if (sp) {
                        params[sp]    = this.start;
                    }
                    if (lp) {
                        params[lp]    = ps;
                    }
                }

                if (!options.silent && this.trigger("before-load", this) === false) {
                    return null;
                }

                this.loading = true;

                this.trigger("loading-start", this);

                return this.loadingPromise = this.model.loadStore(this, params)
                    .done((response) => {
                        if (this.$destroyed) {
                            return;
                        }
                        this.loadingPromise = null;
                        this.fetchedData = this.model.lastFetchedResponse;
                        this._onModelLoadSuccess(response, options);
                    })
                    .fail((reason) => {
                        if (this.$destroyed) {
                            return;
                        }
                        this.loadingPromise = null;
                        this.fetchedData = this.model.lastFetchedResponse;
                        this._onModelLoadFail(reason, options);
                    });
            },

            _onModelLoadSuccess: function(response, options) {

                options = options || {};

                if (options.noopOnEmpty && !response.data.length) {
                    return;
                }

                if ((!options.prepend && !options.append) && 
                    this.clearOnLoad && 
                    this.length > 0) {
                        this.clear(true);
                }

                if (response.total !== null && response.total !== undefined) { 
                    this.totalLength = parseInt(response.total);
                }
                this._load(response.data, options);
            },

            _onModelLoadFail: function(reason, options) {
                this.onFailedLoad();
                if (!options.silent) {
                    this.trigger("failed-load", this, reason);
                }
            },

            /**
             * Override this method to catch successful loads
             * @method
             */
            onLoad: emptyFn,

            /**
             * Override this method to catch failed loads
             * @method
             */
            onFailedLoad: emptyFn,

            /**
             * Save all dirty records
             * @method
             * @param {boolean} silent {
             *  Do not trigger events
             *  @default false
             * }
             * @returns {MetaphorJs.lib.Promise}
             */
            save: function(silent) {

                let recs    = {},
                    cnt     = 0;

                if (this.local) {
                    return null;
                }

                if (this.model.isPlain()) {
                    throw new Error("Cannot save plain store");
                }

                this.each(rec => {
                    if (rec.isDirty()) {
                        recs[rec.getId()] = rec.storeData(rec.getData());
                        cnt++;
                    }
                });

                if (!cnt) {
                    return null;
                }

                if (!silent && this.trigger("before-save", this, recs) === false) {
                    return null;
                }

                return this.model
                    .saveStore(this, recs)
                    .done(response => this._onModelSaveSuccess(response, silent))
                    .fail(reason => this._onModelSaveFail(reason, silent));
            },

            _onModelSaveSuccess: function(response, silent) {

                let i, len,
                    id, rec,
                    data = response.data;

                if (data && data.length) {
                    for (i = 0, len = data.length; i < len; i++) {

                        id      = this.getRecordId(data[i]);
                        rec     = this.getById(id);

                        if (rec) {
                            rec.importData(data[i]);
                        }
                    }
                }

                this.onSave();
                if (!silent) {
                    this.trigger("save", this);
                }
            },

            _onModelSaveFail: function(reason, silent) {
                this.onFailedSave(reason);
                if (!silent) {
                    this.trigger("failed-save", this, reason);
                }
            },

            /**
             * Override this method to catch successful saves
             * @method
             */
            onSave: emptyFn,

            /**
             * Override this method to catch failed saves
             * @method
             */
            onFailedSave: emptyFn,


            /**
             * Delete record by id (send delete request)
             * @method
             * @param {int|string|array} ids Record id(s)
             * @param {boolean} silent {
             *  Do not trigger events
             *  @default false
             * }
             * @param {boolean} skipUpdate {
             *  Skip updating store (re-filter, re-map)
             *  @default false
             * }
             * @returns {MetaphorJs.lib.Promise}
             */
            deleteById: function(ids, silent, skipUpdate) {

                let i, len, rec;

                if (this.local) {
                    return null;
                }

                if (!ids || (isArray(ids) && !ids.length)) {
                    throw new Error("Record id required");
                }

                if (!isArray(ids)) {
                    ids = [ids];
                }

                for (i = 0, len = ids.length; i < len; i++){
                    rec = this.getById(ids[i]);
                    this.remove(rec, silent, skipUpdate);
                    if (rec instanceof MetaphorJs.model.Record) {
                        rec.$destroy();
                    }
                }

                if (!silent && this.trigger("before-delete", this, ids) === false) {
                    return null;
                }

                return this.model.deleteRecords(this, ids)
                    .done(() => {
                        this.totalLength -= ids.length;
                        this.onDelete();
                        if (!silent) {
                            this.trigger("delete", this, ids);
                        }
                    })
                    .fail(() => {
                        this.onFailedDelete();
                        if (!silent) {
                            this.trigger("failed-delete", this, ids);
                        }
                    });
            },

            /**
             * Override this method to catch successful deletes
             * @method
             */
            onDelete: emptyFn,

            /**
             * Override this method to catch failed deletes
             * @method
             */
            onFailedDelete: emptyFn,

            /**
             * Delete record at index
             * @method
             * @param {number} inx Position at which to delete record
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns {MetaphorJs.lib.Promise}
             */
            deleteAt: function(inx, silent, skipUpdate) {
                const rec = this.getAt(inx);

                if (!rec) {
                    throw new Error("Record not found at " + inx);
                }
                return this["delete"](rec, silent, skipUpdate);
            },

            /**
             * Delete record
             * @method
             * @param {MetaphorJs.model.Record} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns {MetaphorJs.lib.Promise}
             */
            "delete": function(rec, silent, skipUpdate) {
                return this.deleteById(this.getRecordId(rec), silent, skipUpdate);
            },

            /**
             * Delete multiple records
             * @method
             * @param {MetaphorJs.model.Record[]} recs
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns {MetaphorJs.lib.Promise}
             */
            deleteRecords: function(recs, silent, skipUpdate) {
                const ids = [];
                let i, len;

                for (i = 0, len = recs.length; i < len; i++) {
                    ids.push(this.getRecordId(recs[i]));
                }

                return this.deleteById(ids, silent, skipUpdate);
            },


            /**
             * Load store if not loaded or call provided callback
             * @method
             * @param {object} options See load()
             * @returns {MetaphorJs.lib.Promise}
             */
            loadOr: function(options) {

                if (!this.local && !this.isLoading() && !this.isLoaded()) {
                    return this.load(null, options);
                }

                return MetaphorJs.lib.Promise.resolve(this);
            },

            /**
             * Load previous page and prepend before current records
             * @method
             * @param {object} options {
             *      See load(). append,prepend and noopOnEmpty will be set to
             *      false, true and true.
             * }
             * @returns {MetaphorJs.lib.Promise}
             */
            addPrevPage: function(options) {

                options = options || {};
                options.append = false;
                options.prepend = true;
                options.noopOnEmpty = true;

                return this.loadPrevPage(options);
            },

            /**
             * Load next page and append after current records
             * @method
             * @param {object} options {
             *      See load(). append,prepend and noopOnEmpty will be set to
             *      true, false and true.
             * }
             * @returns {MetaphorJs.lib.Promise}
             */
            addNextPage: function(options) {
                options = options || {};
                options.append = true;
                options.prepend = false;
                options.noopOnEmpty = true;

                if (!this.local && (!this.totalLength || this.length < this.totalLength)) {
                    return this.load({
                        start:      this.length,
                        limit:      this.pageSize
                    }, options);
                }
                else {
                    return MetaphorJs.lib.Promise.resolve();
                }
            },

            /**
             * Load next page and replace current records with records from 
             * the next page
             * @method
             * @param {object} options See load()
             * @returns {MetaphorJs.lib.Promise}
             */
            loadNextPage: function(options) {

                if (!this.totalLength || 
                    this.local ||
                    this.length < this.totalLength) {

                    this.start += this.pageSize;
                    if (!this.local) {
                        return this.load(null, options);
                    }
                    else {
                        this.update();
                    }
                }
                
                return MetaphorJs.lib.Promise.resolve();
            },

            /**
             * Load prev page and replace current records with records from 
             * the prev page
             * @method
             * @param {object} options See load()
             * @returns {MetaphorJs.lib.Promise}
             */
            loadPrevPage: function(options) {

                if (this.start > 0) {
                    this.start -= this.pageSize;
                    if (this.start < 0) {
                        this.start = 0;
                    }
                    if (!this.local) {
                        return this.load(null, options);
                    }
                    else {
                        this.update();
                    }
                }

                return MetaphorJs.lib.Promise.resolve();
            },

            /**
             * Load a page and replace current records with records from 
             * the page
             * @method
             * @param {int} start Records offset
             * @param {object} options See load()
             * @returns {MetaphorJs.lib.Promise}
             */
            loadPage: function(start, options) {

                this.start = parseInt(start, 10);
                if (this.start < 0) {
                    this.start = 0;
                }
                if (!this.local) {
                    return this.load(null, options);
                }
                else {
                    this.update();
                }
                return MetaphorJs.lib.Promise.resolve();
            },


            /**
             * Extract id from a record
             * @method
             * @param {MetaphorJs.model.Record|object} rec
             * @returns {int|string|null}
             */
            getRecordId: function(rec) {
                if (!rec) {
                    return null;
                }
                else if (rec instanceof MetaphorJs.model.Record) {
                    return rec.getId();
                }
                else if (this.model) {
                    return this.model.getRecordId(rec) || rec[this.idProp] || null;
                }
                else {
                    return rec[this.idProp] || null;
                }
            },

            /**
             * Get record data as plain object
             * @method
             * @param {MetaphorJs.model.Record|object} rec
             * @returns {object}
             */
            getRecordData: function(rec) {
                return this.model.isPlain() ? rec : rec.data;
            },

            /**
             * @ignore
             * @method
             * @access protected
             * @param {MetaphorJs.model.Record|Object} item
             * @returns MetaphorJs.model.Record|Object
             */
            processRawDataItem: function(item) {

                if (item instanceof MetaphorJs.model.Record) {
                    return item;
                }

                if (this.model.isPlain()) {
                    return this.model.extendPlainRecord(
                        this.model.normalizeRecord(item)
                    );
                }
                else {

                    const type    = this.model.type,
                        id      = this.getRecordId(item);
                    let r;

                    if (id) {
                        r       = MetaphorJs.model.Model.getFromCache(type, id);
                    }

                    if (!r) {
                        r       = cls.factory(type, id, item, {
                                    model:      this.model,
                                    standalone: false
                        });
                    }

                    return r;
                }
            },

            /**
             * @ignore
             * @method
             * @param {string} mode on|un
             * @param {MetaphorJs.model.Record} rec
             * @returns {MetaphorJs.model.Record}
             */
            bindRecord: function(mode, rec) {
                rec[mode]("change", this.onRecordChange, this);
                rec[mode]("destroy", this.onRecordDestroy, this);
                rec[mode]("dirty-change", this.onRecordDirtyChange, this);
                return rec;
            },

            /**
             * @ignore
             * @method
             * @access protected
             * @param {MetaphorJs.model.Record|Object} rec
             */
            onRecordDirtyChange: function(rec) {
                this.trigger("update", this, rec);
            },

            /**
             * @ignore
             * @method
             * @access protected
             * @param {MetaphorJs.model.Record|Object} rec
             * @param {string} k
             * @param {string|int|bool} v
             * @param {string|int|bool} prev
             */
            onRecordChange: function(rec, k, v, prev) {
                this.trigger("update", this, rec);
            },

            /**
             * @ignore
             * @method
             * @access protected
             * @param {MetaphorJs.model.Record|Object} rec
             */
            onRecordDestroy: function(rec) {
                this.remove(rec);
            },





            /**
             * Remove and return first record
             * @method
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             * @param {boolean} unfiltered Execute on unfiltered set of records
             * @returns {MetaphorJs.model.Record|Object|null}
             */
            shift: function(silent, skipUpdate, unfiltered) {
                return this.removeAt(0, 1, silent, skipUpdate, unfiltered);
            },

            /**
             * Insert record at the beginning. Works with unfiltered data
             * @method
             * @param {object|MetaphorJs.model.Record} rec
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             * @returns {MetaphorJs.model.Record|object}
             */
            unshift: function(rec, silent, skipUpdate) {
                return this.insert(0, rec, silent, skipUpdate);
            },

            /**
             * Remove and return last record
             * @method
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             * @param {boolean} unfiltered Execute on unfiltered set of records
             * @returns {MetaphorJs.model.Record|object|null}
             */
            pop: function(silent, skipUpdate, unfiltered) {
                return this.removeAt(this.length - 1, 1, silent, skipUpdate, unfiltered);
            },

            /**
             * Add many records to the store. Works with unfiltered data
             * @method
             * @param {MetaphorJs.model.Record[]|object[]} recs
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             */
            addMany: function(recs, silent, skipUpdate) {
                let i, l, start = this.length;

                for (i = 0, l = recs.length; i < l; i++) {
                    this.insert(start + i, recs[i], true, true);
                }

                if (!skipUpdate) {
                    this.update();
                }

                if (l > 0 && !silent) {
                    this.trigger("add", recs);
                }
            },

            /**
             * Add one record to the store. Works with unfiltered data
             * @method
             * @param {MetaphorJs.model.Record|object} rec
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             */
            add: function(rec, silent, skipUpdate) {
                return this.insert(this.length, rec, silent, skipUpdate);
            },

            /**
             * Override this method to catch when records are added
             * @method 
             * @param {int} index
             * @param {MetaphorJs.model.Record|object} rec
             */
            onAdd: emptyFn,

            /**
             * Remove records from specific position
             * @method
             * @param {number} index {
             *  Starting index 
             *  @required
             * }
             * @param {number} length {
             *  Number of records to remove
             *  @default 1
             * }
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             * @param {boolean} unfiltered Execute on unfiltered set of records
             * @returns {MetaphorJs.model.Record|object|undefined}
             */
            removeAt: function(index, length, silent, skipUpdate, unfiltered) {

                let i       = 0,
                    l       = this.length;

                if (l === 0) {
                    return;
                }

                if (index === null) {
                    //index   = 0; ??
                    return;
                }
                while (index < 0) {
                    index   = l + index;
                }

                if (length == null) {
                    length = 1;
                }

                if (!unfiltered) {
                    index   = this.items.indexOf(this.current[index]);
                }

                while (index < this.length && index >= 0 && i < length) {

                    this.length--;
                    const rec     = this.items[index];
                    this.items.splice(index, 1);

                    const id      = this.getRecordId(rec);

                    if (id !== undefined){
                        delete this.itemMap[id];
                        delete this.currentMap[id];
                    }

                    this.onRemove(rec, id);

                    if (!skipUpdate) {
                        this.update();
                    }

                    if (!silent) {
                        this.trigger('remove', rec, id);
                    }

                    if (rec instanceof MetaphorJs.model.Record) {
                        this.bindRecord("un", rec);
                        rec.detachStore(this);

                        if (length === 1) {
                            return rec.$destroyed ? undefined : rec;
                        }
                    }
                    else {
                        if (length === 1) {
                            return rec;
                        }
                    }

                    i++;
                }

                return undefined;
            },

            /**
             * Remove records between start and end indexes
             * @method
             * @param {int} start Start index
             * @param {int} end End index
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             * @param {boolean} unfiltered Execute on unfiltered set of records
             * @returns {MetaphorJs.model.Record|object|undefined}
             */
            removeRange: function(start, end, silent, skipUpdate, unfiltered) {
                const l = this.length;

                if (l === 0) {
                    return;
                }

                if (start == null && end == null) {
                    return this.clear(silent);
                }

                if (start == null) {
                    start   = 0;
                }
                while (start < 0) {
                    start   = l + start;
                }
                if (end == null) {
                    end     = l - 1;
                }
                while (end < 0) {
                    end     = l + start;
                }

                return this.removeAt(start, (end - start) + 1, silent, skipUpdate, unfiltered);
            },

            /**
             * Override this method to catch all record removals
             * @method
             * @param {MetaphorJs.model.Record|object} rec
             * @param {int|string|null} id
             */
            onRemove: emptyFn,

            /**
             * Insert multiple records at specific index. (Works with unfiltered set)
             * @method
             * @param {int} index {
             *  @required
             * }
             * @param {array} recs
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             */
            insertMany: function(index, recs, silent, skipUpdate) {
                let i, l;
                for (i = 0, l = recs.length; i < l; i++) {
                    this.insert(index + i, recs[i], true, true);
                }
                if (l > 0 && !skipUpdate) {
                    this.update();
                }
                if (l > 0 && !silent) {
                    this.trigger("add", recs);
                }
            },

            /**
             * Insert record at specific index. (Works with unfiltered set)
             * @method
             * @param {number} index {
             *  @required
             * }
             * @param {MetaphorJs.model.Record|object} rec
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             * @returns {MetaphorJs.model.Record|object}
             */
            insert: function(index, rec, silent, skipUpdate) {

                let id,
                    last = false;

                rec     = this.processRawDataItem(rec);
                id      = this.getRecordId(rec);

                if(this.itemMap[id]){
                    this.$$observable.suspendAllEvents();
                    this.removeId(id);
                    this.$$observable.resumeAllEvents();
                }

                if(index >= this.length){
                    this.items.push(rec);
                    last = true;
                }
                else {
                    this.items.splice(index, 0, rec);
                }

                this.length++;

                if (this.maxLength && this.length > this.maxLength) {
                    if (last) {
                        this.pop(silent, true);
                    }
                    else {
                        this.shift(silent, true);
                    }
                }

                if(id !== undefined){
                    this.itemMap[id] = rec;
                }

                if (rec instanceof MetaphorJs.model.Record) {
                    rec.attachStore(this);
                    this.bindRecord("on", rec);
                }

                this.onAdd(index, rec);

                if (!skipUpdate) {
                    this.update();
                }

                if (!silent) {
                    this.trigger('add', [rec]);
                }

                return rec;
            },

            /**
             * Replace one record with another
             * @method
             * @param {MetaphorJs.model.Record|object} old Old record
             * @param {MetaphorJs.model.Record|object} rec New record
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             * @returns {MetaphorJs.model.Record|object} new record
             */
            replace: function(old, rec, silent, skipUpdate) {

                const index   = this.items.indexOf(old);

                this.removeAt(index, 1, true, true, true);
                this.insert(index, rec, true, true);

                if (!skipUpdate) {
                    this.update();
                }

                this.onReplace(old, rec);

                if (!silent) {
                    this.trigger('replace', old, rec);
                }

                return rec;
            },


            /**
             * Replace record with given id by another record
             * @method
             * @param {int|string} id Old record id
             * @param {MetaphorJs.model.Record|object} rec New record
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             * @returns {MetaphorJs.model.Record|object} new record
             */
            replaceId: function(id, rec, silent, skipUpdate) {
                const index = this.indexOfId(id);
                return this.replace(this.getAt(index), rec, silent, skipUpdate);
            },

            /**
             * Override this method to catch all record replacements
             * @method
             * @param {MetaphorJs.model.Record|object} old Old record
             * @param {MetaphorJs.model.Record|object} rec New record
             */
            onReplace: emptyFn,

            /**
             * Remove record from the store
             * @method
             * @param {MetaphorJs.model.Record|object} rec
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             * @returns {MetaphorJs.model.Record|object|null}
             */
            remove: function(rec, silent, skipUpdate) {
                const inx = this.indexOf(rec, true);
                if (inx !== -1) {
                    return this.removeAt(inx, 1, silent, skipUpdate, true);
                }
                return null;
            },

            /**
             * Remove record from the store by record id
             * @method
             * @param {string|int} id Record id
             * @param {boolean} silent Do not trigger events
             * @param {boolean} skipUpdate Do not run store updates
             * @returns {MetaphorJs.model.Record|object|null}
             */
            removeId: function(id, silent, skipUpdate) {
                const inx = this.indexOfId(id, true);
                if (inx !== -1) {
                    return this.removeAt(inx, 1, silent, skipUpdate, true);
                }
            },



            /**
             * Does this store contains record
             * @method
             * @param {MetaphorJs.model.Record|object} rec
             * @param {boolean} unfiltered Check unfiltered set
             * @returns {boolean}
             */
            contains: function(rec, unfiltered) {
                return this.indexOf(rec, unfiltered) !== -1;
            },

            /**
             * Does this store contains a record with given id
             * @method
             * @param {string|int} id Record id
             * @param {boolean} unfiltered Check in unfiltered set
             * @returns {boolean}
             */
            containsId: function(id, unfiltered) {
                if (unfiltered) {
                    return this.itemMap[id] !== undefined;
                }
                else {
                    return this.currentMap[id] !== undefined;
                }
            },

            /**
             * Remove all records from the store
             * @method
             * @param {boolean} silent Do not trigger events
             */
            clear: function(silent) {

                const recs = this.getRange();

                this._reset();
                this.onClear();

                if (!silent) {
                    this.trigger('update', this);
                    this.trigger('clear', this, recs);
                }
            },

            /**
             * Override this method to catch when the store is being cleared
             * @method
             */
            onClear: emptyFn,

            /**
             * Same as clear but it doesn't trigger any events. 
             * This is what clear() calls internally
             * @method
             */
            reset: function() {
                this._reset();
                this.start = 0;
            },

            _reset: function(keepRecords) {
                let i, len, rec;

                if (!keepRecords) {
                    for (i = 0, len = this.items.length; i < len; i++) {
                        rec = this.items[i];
                        if (rec instanceof MetaphorJs.model.Record) {
                            this.bindRecord("un", rec);
                            rec.detachStore(this);
                        }
                    }
                }

                this.length         = 0;
                this.currentLength  = 0;
                this.totalLength    = 0;
                this.items          = [];
                this.current        = [];
                this.itemMap        = {};
                this.currentMap     = {};
                this.loaded         = this.local;
            },


            /**
             * Get record at given index
             * @method
             * @param {int} index
             * @param {boolean} unfiltered Get from unfiltered set
             * @returns {MetaphorJs.model.Record|object|null}
             */
            getAt: function(index, unfiltered) {
                return unfiltered ?
                       (this.items[index] || undefined) :
                       (this.current[index] || undefined);
            },

            /**
             * Get record by id
             * @method
             * @param {string|int} id Record id
             * @param {boolean} unfiltered Get from unfiltered set
             * @returns {MetaphorJs.model.Record|object|null}
             */
            getById: function(id, unfiltered) {
                return unfiltered ?
                       (this.itemMap[id] || undefined) :
                       (this.currentMap[id] || undefined);
            },

            /**
             * Get index of record
             * @method
             * @param {MetaphorJs.model.Record|object} rec
             * @param {boolean} unfiltered Lookup in unfiltered set
             * @returns {int} returns -1 if not found
             */
            indexOf: function(rec, unfiltered) {
                return unfiltered ?
                       this.items.indexOf(rec) :
                       this.current.indexOf(rec);
            },

            /**
             * Get index of record by given record id
             * @method
             * @param {string|int} id Record id
             * @param {boolean} unfiltered Lookup in unfiltered set
             * @returns {int} returns -1 if not found
             */
            indexOfId: function(id, unfiltered) {
                return this.indexOf(this.getById(id, unfiltered), unfiltered);
            },

            /**
             * Interate over store records
             * @method
             * @param {function} fn {
             *      @param {MetaphorJs.model.Record|object} rec
             *      @param {number} index
             *      @param {number} length
             *      @returns {boolean|null} return false to stop
             * }
             * @param {object} context fn's context
             * @param {boolean} unfiltered Iterate over unfiltered set
             */
            each: function(fn, context, unfiltered) {
                const items = unfiltered ?
                            this.items.slice() :
                            this.current.slice();
                let i, len;

                for(i = 0, len = items.length; i < len; i++){
                    if(fn.call(context, items[i], i, len) === false){
                        break;
                    }
                }
            },

            /**
             * Map store
             * @param {function} fn 
             * @param {object} context 
             * @param {boolean} unfiltered 
             * @returns []
             */
            map: function(fn, context, unfiltered) {
                const ret = [];
                this.each(rec => ret.push(fn.call(context, rec)), null, unfiltered);
                return ret;
            },

            /**
             * Iterate over store records
             * @method
             * @param {function} fn {
             *      @param {string|number} id Record id
             *      @param {number} index Record position in set
             *      @param {number} length Set length
             *      @returns {boolean|null} return false to stop
             * }
             * @param {object} context fn's context
             * @param {boolean} unfiltered Iterate over unfiltered set
             */
            eachId: function(fn, context, unfiltered) {
                this.each(
                    (rec, i, len) => 
                        fn.call(context, this.getRecordId(rec), i, len), 
                    null, 
                    unfiltered
                );
            },

            /**
             * Collect values of given field
             * @method
             * @param {string} f Field name
             * @param {boolean} unfiltered Collect from unfiltered set
             * @returns {array}
             */
            collect: function(f, unfiltered) {

                const rt      = !this.model.isPlain();

                return this.map(
                            rec => rt ? rec.get(f) : rec[f], 
                            null, 
                            unfiltered
                        )
                        .filter(r => r !== undefined)
            },

            /**
             * Get first record
             * @method
             * @param {boolean} unfiltered Get from unfiltered set
             * @returns {MetaphorJs.model.Record|object|null}
             */
            first : function(unfiltered){
                return unfiltered ? this.items[0] : 
                                    this.current[0];
            },

            /**
             * Get last record
             * @method
             * @param {boolean} unfiltered Get from unfiltered set
             * @returns {MetaphorJs.model.Record|object|null}
             */
            last : function(unfiltered){
                return unfiltered ? this.items[this.length-1] : 
                                    this.current[this.current-1];
            },

            /**
             * Get a slice of records list
             * @method
             * @param {number} start {
             *  Start index
             *  @default 0
             * }
             * @param {number} end {
             *  End index
             *  @default length-1
             * }
             * @param {boolean} unfiltered Get from unfiltered set
             * @returns {MetaphorJs.model.Record[]|object[]}
             */
            getRange : function(start, end, unfiltered){
                const items   = unfiltered ? this.items : this.current,
                      r       = [];
                let   i;

                if(items.length < 1){
                    return r;
                }

                start   = start || 0;
                end     = Math.min(end == undefined ? this.length-1 : end, this.length-1);

                if(start <= end){
                    for(i = start; i <= end; i++) {
                        r.push(items[i]);
                    }
                }else{
                    for(i = start; i >= end; i--) {
                        r.push(items[i]);
                    }
                }
                return r;
            },

            /**
             * Find and return record matching custom filter
             * @method
             * @param {function} fn {
             *      @param {MetaphorJs.model.Record|object} rec
             *      @param {string|int} id
             *      @returns {boolean} Return true to accept record
             * }
             * @param {object} context fn's context
             * @param {number} start { @default 0 }
             * @param {boolean} unfiltered Look in unfiltered set
             * @returns {MetaphorJs.model.Record|object|null}
             */
            findBy: function(fn, context, start, unfiltered) {
                const inx = this.findIndexBy(fn, context, start, unfiltered);
                return inx === -1 ? undefined : this.getAt(inx, unfiltered);
            },

            /**
             * Find index of a record matching custom filter
             * @method
             * @param {function} fn {
             *      @param {MetaphorJs.model.Record|object} rec
             *      @param {string|int} id
             *      @returns {boolean} return true to accept record
             * }
             * @param {object} context fn's context
             * @param {number} start { @default 0 }
             * @param {boolean} unfiltered Look in unfiltered set
             * @returns {int} returns -1 if not found
             */
            findIndexBy : function(fn, context, start, unfiltered) {

                const it  = unfiltered ? this.items : this.current;
                let i, len;

                for(i = (start||0), len = it.length; i < len; i++) {
                    if(fn.call(context, it[i], this.getRecordId(it[i]))){
                        return i;
                    }
                }

                return -1;
            },

            /**
             * Find record by its field value
             * @method
             * @param {string} property Record's field name
             * @param {string|int|bool} value Value to compare to
             * @param {bool} exact Make a strict comparison
             * @param {boolean} unfiltered Look in unfiltered set
             * @returns {MetaphorJs.model.Record|object|null}
             * @code store.find("name", "Jane");
             */
            find: function(property, value, exact, unfiltered) {

                const rt    = !this.model.isPlain();
                const inx   = this.findIndexBy(rec => {

                    const v = rt ? rec.get(property) : rec[property];

                    if (exact) {
                        return v === value;
                    }
                    else {
                        return v == value;
                    }

                }, this, 0, unfiltered);

                return inx !== -1 ? this.getAt(inx, unfiltered) : null;
            },

            /**
             * Find record by its field value.<br>
             * Same as <code>find()</code> but with exact=true
             * @method
             * @param {string} property Record's field name
             * @param {string|int|bool} value Value to compare to
             * @param {boolean} unfiltered Look in unfiltered set
             * @returns {MetaphorJs.model.Record|object|null}
             */
            findExact: function(property, value, unfiltered) {
                return this.find(property, value, true, unfiltered);
            },

            /**
             * Find record by a set of fields
             * @method
             * @param {object} props A set of field:value pairs to match record against.
             * All fields must match for the record to be accepted.
             * @param {boolean} unfiltered Look in unfiltered set
             * @returns {MetaphorJs.model.Record|object|null}
             */
            findBySet: function(props, unfiltered) {

                let found   = null,
                    match,
                    i;

                this.each(function(rec){

                    match   = true;

                    for (i in props) {
                        if (props[i] != rec[i]) {
                            match   = false;
                            break;
                        }
                    }

                    if (match) {
                        found   = rec;
                        return false;
                    }

                    return true;
                }, null, unfiltered);

                return found;
            },




            /**
             * Re-apply filter and sorting. 
             * Call this function if you used <code>skipUpdate</code> before.
             * @method
             */
            update: function() {

                const filtered    = this.filtered,
                      sorted      = this.sorted,
                      isPlain     = this.model.isPlain();

                if (this.local) {
                    this.totalLength = this.length = this.items.length;
                }

                this.currentLength  = this.length;
                this.currentMap     = this.itemMap;
                this.current        = this.items;

                if (filtered) {

                    const by              = this.filterBy,
                          opt             = this.filterOpt;
                    let current, map;

                    this.current        = current = [];
                    this.currentMap     = map = {};

                    this.each((rec) => {
                        if (filterArray.compare(isPlain ? rec : rec.data, by, opt)) {
                            current.push(rec);
                            map[this.getRecordId(rec)] = rec;
                        }
                    }, null, true);

                    this.currentLength  = this.current.length;
                }

                if (this.local && this.pageSize) {
                    this.current = this.current.slice(this.start, this.start + this.pageSize);
                    this.currentLength  = this.current.length;
                }

                if (sorted) {
                    const sortBy        = this.sortBy,
                        rt              = !this.model.isPlain(),
                        getterFn        = function(item) {
                            return rt ? item.get(sortBy) : item[sortBy];
                        };

                    this.current        = sortArray(
                        this.current, 
                        isFunction(sortBy) ? {fn: sortBy} : getterFn, 
                        this.sortDir
                    );
                }

                this.trigger("update", this);
            },


            /**
             * Filter store using a custom filter. This will change store contents
             * and length and you might have to use <code>unfiltered</code> flag
             * in some of the methods later. 
             * @method
             * @param {object|string|regexp|function|boolean} by
             * @param {string|boolean} opt
             * @code metaphorjs-shared/src-docs/examples/filterArray.js
             */
            filter: function(by, opt) {

                this.filtered       = true;
                this.filterBy       = by;
                this.filterOpt      = opt;

                this.update();
            },

            /**
             * Clear filter
             * @method
             */
            clearFilter: function() {

                if (!this.filtered) {
                    return;
                }

                this.filterBy = null;
                this.filterOpt = null;

                this.update();
            },

            /**
             * Sort array
             * @method
             * @param {string|function} by {
             *  Either a field name to sort by, or a function 
             *  @param {MetaphorJs.model.Record|object} a
             *  @param {MetaphorJs.model.Record|object} b 
             *  @returns {int} -1|0|1
             * }
             * @param {string} dir asc|desc
             */
            sort: function(by, dir) {
                this.sorted = true;
                this.sortBy = by;
                this.sortDir = dir;
                this.update();
            },

            /**
             * Clear sorting
             * @method
             */
            clearSorting: function() {
                this.sorted = false;
                this.sortBy = null;
                this.sortDir = null;
                this.update();
            },


            onDestroy: function() {

                delete allStores[this.id];

                if (this.sourceStore) {
                    this.initSourceStore(this.sourceStore, "un");
                }

                this.clear();
                this.trigger("destroy", this);
                this.$super();
            }

        },

        {
            /**
             * Find store
             * @static
             * @method
             * @param {string} id
             * @returns MetaphorJs.model.Store|null
             */
            lookupStore: function(id) {
                return allStores[id] || null;
            },

            /**
             * Iterate over registered stores
             * @static
             * @method
             * @param {function} fn {
             *  @param {MetaphorJs.model.Store} store
             *  @returns {boolean} return false to stop
             * }
             * @param {object} fnScope
             */
            eachStore: function(fn, fnScope) {

                let id;

                for (id in allStores) {
                    if (fn.call(fnScope, allStores[id]) === false) {
                        break;
                    }
                }
            }
        }
    );
}();