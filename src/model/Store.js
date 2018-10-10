
var extend  = require("metaphorjs-shared/src/func/extend.js"),
    emptyFn = require("metaphorjs-shared/src/func/emptyFn.js"),
    isArray = require("metaphorjs-shared/src/func/isArray.js"),
    cls = require("metaphorjs-class/src/cls.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js"),
    isString = require("metaphorjs-shared/src/func/isString.js"),
    undf = require("metaphorjs-shared/src/var/undf.js"),
    nextUid = require("metaphorjs-shared/src/func/nextUid.js"),
    filterArray = require("metaphorjs-shared/src/func/filterArray.js"),
    sortArray = require("metaphorjs-shared/src/func/sortArray.js");
    
require("../__init.js");
require("./Model.js");
require("./Record.js");    
require("metaphorjs-observable/src/mixin/Observable.js");

module.exports = MetaphorJs.model.Store = function(){

    var allStores   = {};

    /**
     * @class MetaphorJs.model.Store
     * @mixes MetaphorJs.mixin.Observable
     */
    return cls({

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
            map:            null,
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

                var self        = this;

                self.items      = [];
                self.current    = [];
                self.map        = {};
                self.currentMap = {};
                self.loaded     = false;
                self.extraParams    = self.extraParams || {};

                if (url && !isString(url)) {
                    initialData = options;
                    options     = url;
                    url         = null;
                }

                options         = options || {};

                if (url) {
                    options.url = url;
                }

                self.$super(options);
                extend(self, options, true, false);

                self.id         = self.id || nextUid();
                
                if (self.publicStore) {
                    allStores[self.id]  = self;
                }

                self.initModel(options);

                self.$$observable.createEvent("beforeload", false);

                if (!self.local && self.autoLoad) {
                    self.load();
                }
                else if (initialData) {
                    if (isArray(initialData)) {
                        self._loadArray(initialData);
                    }
                    else {
                        self._loadAjaxData(initialData);
                    }
                }

                if (self.local) {
                    self.loaded     = true;
                }

                if (self.sourceStore) {
                    self.initSourceStore(self.sourceStore, "on");
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

                var self = this;

                if (isString(self.model)) {
                    self.model  = MetaphorJs.model.Model.create(self.model);
                }
                else if (!(self.model instanceof MetaphorJs.model.Model)) {
                    self.model  = new MetaphorJs.model.Model(self.model);
                }

                if (options.url) {
                    self.model.store.load    = options.url;
                }

                self.idProp = self.model.getStoreProp("load", "id");
            },


            initSourceStore: function(sourceStore, mode) {
                var self = this;
                sourceStore[mode]("update", self.onSourceStoreUpdate, self);
            },

            onSourceStoreUpdate: function() {

                var self    = this;
                self.$$observable.suspendAllEvents();

                self.clear();
                self.addMany(self.sourceStore.toArray());

                self.$$observable.resumeAllEvents();
                self.trigger("update", self);
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
             * @returns {boolean}
             */
            isEmpty: function() {
                return this.length === 0;
            },

            /**
             * Get number of pages (based on pageSize setting)
             * @method
             * @returns {number}
             */
            getPagesCount: function() {

                var self    = this;

                if (self.pageSize !== null) {
                    return parseInt(self.totalLength / self.pageSize);
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
            getAjaxData: function() {
                return this.ajaxData;
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
                var ret = false;
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
                var recs    = [];
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
            _loadAjaxData: function(data, options) {

                var self    = this;

                options = options || {};

                if (!options.silent && self.trigger("before-load", self) === false) {
                    return;
                }

                self.ajaxData = data;

                self.model._processStoreResponse("load", data, {
                    resolve: function(response) {
                        self._onModelLoadSuccess(response, options);
                    },
                    reject: function(reason) {
                        self._onModelLoadFail(reason, options);
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

                var self    = this;

                options = options || {};

                if (!options.silent && self.trigger("before-load", self) === false) {
                    return;
                }

                if (isArray(recs)) {
                    self._load(recs, options);
                    self.totalLength    = self.length;
                }
            },



            /**
             * @ignore
             * load records no matter where they came from
             * @param {[]} recs
             * @param {{}} options
             */
            _load: function(recs, options) {

                var self    = this,
                    prepend = options.prepend;

                options = options || {};
                recs = recs || [];

                if (prepend) {
                    self.insertMany(0, recs, true, true)
                }
                else {
                    self.addMany(recs, true, true);
                }

                /*for (var i = 0; i < recs.length; i++) {
                    if (prepend) {
                        self.insert(i, recs[i], true, true);
                    }
                    else {
                        self.add(recs[i], true, true);
                    }
                }*/

                self.loaded     = true;
                self.loading    = false;

                self.trigger("loading-end", self);
                self.onLoad();

                if (!options.skipUpdate) {
                    self.update();
                }

                if (!options.silent) {
                    self.trigger("load", self);
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

                var self    = this,
                    ms      = self.model.store,
                    sp      = ms.start,
                    lp      = ms.limit,
                    ps      = self.pageSize;

                if (self.loadingPromise && self.loadingPromise.abort) {
                    self.loadingPromise.abort();
                }

                options     = options || {};

                if (self.local) {
                    return null;
                }

                params      = extend({}, self.extraParams, params || {});

                if (ps !== null && !params[sp] && !params[lp]) {
                    if (sp) {
                        params[sp]    = self.start;
                    }
                    if (lp) {
                        params[lp]    = ps;
                    }
                }

                if (!options.silent && self.trigger("before-load", self) === false) {
                    return null;
                }

                self.loading = true;

                self.trigger("loading-start", self);

                return self.loadingPromise = self.model.loadStore(self, params)
                    .done(function(response) {
                        if (self.$destroyed) {
                            return;
                        }
                        self.loadingPromise = null;
                        self.ajaxData = self.model.lastAjaxResponse;
                        self._onModelLoadSuccess(response, options);
                    })
                    .fail(function(reason){
                        if (self.$destroyed) {
                            return;
                        }
                        self.loadingPromise = null;
                        self.ajaxData = self.model.lastAjaxResponse;
                        self._onModelLoadFail(reason, options);
                    });
            },

            _onModelLoadSuccess: function(response, options) {

                var self = this;
                options = options || {};

                if (options.noopOnEmpty && !response.data.length) {
                    return;
                }

                if ((!options.prepend && !options.append) && self.clearOnLoad && self.length > 0) {
                    self.clear(true);
                }

                self.totalLength = parseInt(response.total);
                self._load(response.data, options);
            },

            _onModelLoadFail: function(reason, options) {
                var self = this;
                self.onFailedLoad();
                if (!options.silent) {
                    self.trigger("failed-load", self, reason);
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

                var self    = this,
                    recs    = {},
                    cnt     = 0;

                if (self.local) {
                    return null;
                }

                if (self.model.isPlain()) {
                    throw new Error("Cannot save plain store");
                }

                self.each(function(rec) {
                    if (rec.isDirty()) {
                        recs[rec.getId()] = rec.storeData(rec.getData());
                        cnt++;
                    }
                });

                if (!cnt) {
                    return null;
                }

                if (!silent && self.trigger("before-save", self, recs) === false) {
                    return null;
                }

                return self.model.saveStore(self, recs)
                    .done(function(response){
                        self._onModelSaveSuccess(response, silent);
                    })
                    .fail(function(reason){
                        self._onModelSaveFail(reason, silent);
                    });

            },

            _onModelSaveSuccess: function(response, silent) {

                var self = this,
                    i, len,
                    id, rec,
                    data = response.data;

                if (data && data.length) {
                    for (i = 0, len = data.length; i < len; i++) {

                        id      = self.getRecordId(data[i]);
                        rec     = self.getById(id);

                        if (rec) {
                            rec.importData(data[i]);
                        }
                    }
                }

                self.onSave();
                if (!silent) {
                    self.trigger("save", self);
                }
            },

            _onModelSaveFail: function(reason, silent) {
                var self = this;
                self.onFailedSave(reason);
                if (!silent) {
                    self.trigger("failed-save", self);
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

                var self    = this,
                    i, len, rec;

                if (self.local) {
                    return null;
                }

                if (!ids || (isArray(ids) && !ids.length)) {
                    throw new Error("Record id required");
                }

                if (!isArray(ids)) {
                    ids = [ids];
                }

                for (i = 0, len = ids.length; i < len; i++){
                    rec = self.getById(ids[i]);
                    self.remove(rec, silent, skipUpdate);
                    if (rec instanceof MetaphorJs.model.Record) {
                        rec.$destroy();
                    }
                }

                if (!silent && self.trigger("before-delete", self, ids) === false) {
                    return null;
                }

                return self.model.deleteRecords(self, ids)
                    .done(function() {
                        self.totalLength -= ids.length;
                        self.onDelete();
                        if (!silent) {
                            self.trigger("delete", self, ids);
                        }
                    })
                    .fail(function() {
                        self.onFailedDelete();
                        if (!silent) {
                            self.trigger("failed-delete", self, ids);
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
                var self    = this,
                    rec     = self.getAt(inx);

                if (!rec) {
                    throw new Error("Record not found at " + inx);
                }
                return self["delete"](rec, silent, skipUpdate);
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
                var self    = this;
                return self.deleteById(self.getRecordId(rec), silent, skipUpdate);
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
                var ids     = [],
                    self    = this,
                    i, len;

                for (i = 0, len = recs.length; i < len; i++) {
                    ids.push(self.getRecordId(recs[i]));
                }

                return self.deleteById(ids, silent, skipUpdate);
            },


            /**
             * Load store if not loaded or call provided callback
             * @method
             * @param {object} options See load()
             * @returns {MetaphorJs.lib.Promise}
             */
            loadOr: function(options) {

                var self    = this;

                if (!self.local && !self.isLoading() && !self.isLoaded()) {
                    return self.load(null, options);
                }

                return MetaphorJs.lib.Promise.resolve(self);
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
                var self    = this;

                options = options || {};
                options.append = false;
                options.prepend = true;
                options.noopOnEmpty = true;

                return self.loadPrevPage(options);
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

                var self    = this;

                options = options || {};
                options.append = true;
                options.prepend = false;
                options.noopOnEmpty = true;

                if (!self.local && (!self.totalLength || self.length < self.totalLength)) {
                    return self.load({
                        start:      self.length,
                        limit:      self.pageSize
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

                var self    = this;

                if (!self.local && (!self.totalLength || 
                                    self.length < self.totalLength)) {
                    self.start += self.pageSize;
                    return self.load(null, options);
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

                var self    = this;

                if (!self.local && self.start > 0) {
                    self.start -= self.pageSize;
                    if (self.start < 0) {
                        self.start = 0;
                    }
                    return self.load(null, options);
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
                var self = this;
                if (!self.local) {
                    self.start = parseInt(start, 10);
                    if (self.start < 0) {
                        self.start = 0;
                    }
                    return self.load(null, options);
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
                if (rec instanceof MetaphorJs.model.Record) {
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

                var self    = this;

                if (item instanceof Record) {
                    return item;
                }

                if (self.model.isPlain()) {
                    return self.model.extendPlainRecord(item);
                }
                else {

                    var type    = self.model.type,
                        id      = self.getRecordId(item),
                        r;

                    if (id) {
                        r       = MetaphorJs.model.Model.getFromCache(type, id);
                    }

                    if (!r) {
                        r       = cls.factory(type, id, item, {
                                    model:      self.model,
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
                var self = this;
                rec[mode]("change", self.onRecordChange, self);
                rec[mode]("destroy", self.onRecordDestroy, self);
                rec[mode]("dirty-change", self.onRecordDirtyChange, self);
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
                var i, l, self = this, start = self.length;

                for (i = 0, l = recs.length; i < l; i++) {
                    self.insert(start + i, recs[i], true, true);
                }

                if (!skipUpdate) {
                    self.update();
                }

                if (l > 0 && !silent) {
                    self.trigger("add", recs);
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

                var self    = this,
                    i       = 0,
                    l       = self.length;

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
                    index   = self.items.indexOf(self.current[index]);
                }

                while (index < self.length && index >= 0 && i < length) {

                    self.length--;
                    var rec     = self.items[index];
                    self.items.splice(index, 1);

                    var id      = self.getRecordId(rec);

                    if (id !== undf){
                        delete self.map[id];
                        delete self.currentMap[id];
                    }

                    self.onRemove(rec, id);

                    if (!skipUpdate) {
                        self.update();
                    }

                    if (!silent) {
                        self.trigger('remove', rec, id);
                    }

                    if (rec instanceof MetaphorJs.model.Record) {
                        self.bindRecord("un", rec);
                        rec.detachStore(self);

                        if (length === 1) {
                            return rec.$destroyed ? undf : rec;
                        }
                    }
                    else {
                        if (length === 1) {
                            return rec;
                        }
                    }

                    i++;
                }

                return undf;
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
                var l       = this.length;

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
                var i, l, self = this;
                for (i = 0, l = recs.length; i < l; i++) {
                    self.insert(index + i, recs[i], true, true);
                }
                if (l > 0 && !skipUpdate) {
                    self.update();
                }
                if (l > 0 && !silent) {
                    self.trigger("add", recs);
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

                var self = this,
                    id,
                    last = false;

                rec     = self.processRawDataItem(rec);
                id      = self.getRecordId(rec);

                if(self.map[id]){
                    self.$$observable.suspendAllEvents();
                    self.removeId(id);
                    self.$$observable.resumeAllEvents();
                }

                if(index >= self.length){
                    self.items.push(rec);
                    last = true;
                }
                else {
                    self.items.splice(index, 0, rec);
                }

                self.length++;

                if (self.maxLength && self.length > self.maxLength) {
                    if (last) {
                        self.pop(silent, true);
                    }
                    else {
                        self.shift(silent, true);
                    }
                }

                if(id !== undf){
                    self.map[id] = rec;
                }

                if (rec instanceof Record) {
                    rec.attachStore(self);
                    self.bindRecord("on", rec);
                }

                self.onAdd(index, rec);

                if (!skipUpdate) {
                    self.update();
                }

                if (!silent) {
                    self.trigger('add', [rec]);
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
                var self    = this,
                    index;

                index   = self.items.indexOf(old);

                self.removeAt(index, 1, true, true, true);
                self.insert(index, rec, true, true);

                if (!skipUpdate) {
                    self.update();
                }

                self.onReplace(old, rec);

                if (!silent) {
                    self.trigger('replace', old, rec);
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
                var self    = this,
                    index;

                index = self.indexOfId(id);

                return self.replace(self.getAt(index), rec, silent, skipUpdate);
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
                var inx = this.indexOf(rec, true);
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
                var inx = this.indexOfId(id, true);
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
                    return this.map[id] !== undf;
                }
                else {
                    return this.currentMap[id] !== undf;
                }
            },

            /**
             * Remove all records from the store
             * @method
             * @param {boolean} silent Do not trigger events
             */
            clear: function(silent) {

                var self    = this,
                    recs    = self.getRange();

                self._reset();
                self.onClear();

                if (!silent) {
                    self.trigger('clear', recs);
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
                var self    = this,
                i, len, rec;

                if (!keepRecords) {
                    for (i = 0, len = self.items.length; i < len; i++) {
                        rec = self.items[i];
                        if (rec instanceof Record) {
                            self.bindRecord("un", rec);
                            rec.detachStore(self);
                        }
                    }
                }

                self.length         = 0;
                self.currentLength  = 0;
                self.totalLength    = 0;
                self.items          = [];
                self.current        = [];
                self.map            = {};
                self.currentMap     = {};
                self.loaded         = self.local;
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
                       (this.items[index] || undf) :
                       (this.current[index] || undf);
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
                       (this.map[id] || undf) :
                       (this.currentMap[id] || undf);
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
                var items = unfiltered ?
                            this.items.slice() :
                            this.current.slice();

                for(var i = 0, len = items.length; i < len; i++){
                    if(fn.call(context, items[i], i, len) === false){
                        break;
                    }
                }
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

                var self    = this;

                self.each(function(rec, i, len){
                    return fn.call(context, self.getRecordId(rec), i, len);
                }, null, unfiltered);
            },

            /**
             * Collect values of given field
             * @method
             * @param {string} f Field name
             * @param {boolean} unfiltered Collect from unfiltered set
             * @returns {array}
             */
            collect: function(f, unfiltered) {

                var coll    = [],
                    self    = this,
                    rt      = !self.model.isPlain();

                self.each(function(rec){

                    var val = rt ? rec.get(f) : rec[f];

                    if (val) {
                        coll.push(val);
                    }
                }, null, unfiltered);

                return coll;
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
                var self    = this,
                    items   = unfiltered ? self.items : self.current,
                    r       = [],
                    i;

                if(items.length < 1){
                    return r;
                }

                start   = start || 0;
                end     = Math.min(end == undf ? self.length-1 : end, self.length-1);

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
                var inx = this.findIndexBy(fn, context, start, unfiltered);
                return inx === -1 ? undf : this.getAt(inx, unfiltered);
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

                var self = this,
                    it  = unfiltered ? self.items : self.current;

                for(var i = (start||0), len = it.length; i < len; i++){
                    if(fn.call(context, it[i], self.getRecordId(it[i]))){
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

                var self    = this,
                    rt      = !self.model.isPlain(),
                    v;

                var inx = self.findIndexBy(function(rec) {

                    v = rt ? rec.get(property) : rec[property];

                    if (exact) {
                        return v === value;
                    }
                    else {
                        return v == value;
                    }

                }, self, 0, unfiltered);

                return inx !== -1 ? self.getAt(inx, unfiltered) : null;
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

                var found   = null,
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

                var self        = this,
                    filtered    = self.filtered,
                    sorted      = self.sorted,
                    isPlain     = self.model.isPlain();

                self.currentLength  = self.length;
                self.currentMap     = self.map;
                self.current        = self.items;

                if (filtered) {

                    var by              = self.filterBy,
                        opt             = self.filterOpt,
                        current,
                        map;

                    self.current        = current = [];
                    self.currentMap     = map = {};

                    self.each(function(rec){
                        if (filterArray.compare(isPlain ? rec : rec.data, by, opt)) {
                            current.push(rec);
                            map[self.getRecordId(rec)] = rec;
                        }
                    }, null, true);

                    self.currentLength  = self.current.length;
                }

                if (sorted) {
                    var sortBy          = self.sortBy,
                        rt              = !self.model.isPlain(),
                        getterFn        = function(item) {
                            return rt ? item.get(sortBy) : item[sortBy];
                        };
                    self.current        = sortArray(
                        self.current, 
                        isFunction(sortBy) ? {fn: sortBy} : getterFn, 
                        self.sortDir
                    );
                }

                self.trigger("update", self);
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

                var self    = this;

                self.filtered       = true;
                self.filterBy       = by;
                self.filterOpt      = opt;

                self.update();
            },

            /**
             * Clear filter
             * @method
             */
            clearFilter: function() {

                var self    = this;

                if (!self.filtered) {
                    return;
                }

                self.filterBy = null;
                self.filterOpt = null;

                self.update();
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
                var self = this;
                self.sorted = true;
                self.sortBy = by;
                self.sortDir = dir;
                self.update();
            },

            /**
             * Clear sorting
             * @method
             */
            clearSorting: function() {
                var self = this;
                self.sorted = false;
                self.sortBy = null;
                self.sortDir = null;
                self.update();
            },


            onDestroy: function() {

                var self    = this;

                delete allStores[self.id];

                if (self.sourceStore) {
                    self.initSourceStore(self.sourceStore, "un");
                }

                self.clear();

                self.trigger("destroy", self);

                self.$super();
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

                var id;

                for (id in allStores) {
                    if (fn.call(fnScope, allStores[id]) === false) {
                        break;
                    }
                }
            }
        }
    );
}();