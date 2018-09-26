
var Model   = require("./Model.js"),
    Record  = require("./Record.js"),
    extend  = require("metaphorjs/src/func/extend.js"),
    emptyFn = require("metaphorjs/src/func/emptyFn.js"),
    isArray = require("metaphorjs/src/func/isArray.js"),
    cls = require("metaphorjs-class/src/cls.js"),
    MetaphorJs = require("metaphorjs/src/MetaphorJs.js"),
    isString = require("metaphorjs/src/func/isString.js"),
    undf = require("metaphorjs/src/var/undf.js"),
    nextUid = require("metaphorjs/src/func/nextUid.js"),
    filterArray = require("metaphorjs/src/func/array/filterArray.js"),
    sortArray = require("metaphorjs/src/func/array/sortArray.js");

require("metaphorjs/src/func/array/aIndexOf.js");
require("metaphorjs-observable/src/mixin/Observable.js");

module.exports = function(){

    var allStores   = {};

    /**
     * @namespace MetaphorJs
     * @class MetaphorJs.Store
     */
    return cls({

            $class:         "MetaphorJs.model.Store",
            $mixins:        [MetaphorJs.mixin.Observable],

            /**
             * @var {string}
             * @access protected
             */
            id:             null,
            /**
             * @var {bool}
             * @access protected
             */
            autoLoad:       false,
            /**
             * @var {bool}
             * @access protected
             */
            clearOnLoad:    true,

            /**
             * @var {MetaphorJs.Model}
             * @access protected
             */
            model:          null,

            /**
             * Extra params to pass to Model when loading stuff
             * @var {object}
             * @access protected
             */
            extraParams:    null,

            /**
             * @var {bool}
             * @access protected
             */
            loaded:         false,
            /**
             * @var {bool}
             * @access protected
             */
            loading:        false,
            /**
             * @var {bool}
             * @access protected
             */
            local:          false,

            /**
             * @var {[]}
             * @access protected
             */
            items:          null,

            /**
             * @var {[]}
             * @access protected
             */
            current:        null,

            /**
             * @var {object}
             * @access protected
             */
            map:            null,

            /**
             * @var {object}
             * @access protected
             */
            currentMap:     null,

            /**
             * @var {number}
             * @access protected
             */
            length:         0,

            /**
             * @var {number}
             * @access protected
             */
            currentLength:  0,

            /**
             * @var {number}
             * @access protected
             */
            maxLength:      0,

            /**
             * @var {number}
             * @access protected
             */
            totalLength:    0,

            /**
             * @var {number}
             * @access protected
             */
            start:          0,

            /**
             * @var {number}
             * @access protected
             */
            pageSize:       null,

            /**
             * @var {number}
             * @access protected
             */
            pages:          null,

            /**
             * @var {bool}
             * @access protected
             */
            filtered:       false,

            /**
             * @var {bool}
             * @access protected
             */
            sorted:         false,


            /**
             * @access protected
             * @var {{}|string}
             */
            filterBy:       null,

            /**
             * @var {string|boolean}
             * @access protected
             */
            filterOpt:      null,

            /**
             * @var {string}
             * @access protected
             */
            sortBy:         null,

            /**
             * @var {string}
             * @access protected
             */
            sortDir:        null,

            /**
             * @var {boolean}
             * @access protected
             */
            publicStore: false,

            /**
             * @var {string}
             * @access protected
             */
            idProp: null,

            /**
             * @var {Promise}
             * @access private
             */
            loadingPromise: null,

            /**
             * @constructor
             * @name initialize
             * @param {object} options
             * @param {[]} initialData
             */

            /**
             * @constructor
             * @param {string} url
             * @param {object} options
             * @param {[]} initialData
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

            setModel: function(model) {
                this.model = model;
                this.initModel({});
            },

            initModel: function(options) {

                var self = this;

                if (isString(self.model)) {
                    self.model  = Model.create(self.model);
                }
                else if (!(self.model instanceof Model)) {
                    self.model  = new Model(self.model);
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
             * @returns string
             */
            getId: function() {
                return this.id;
            },

            /**
             * @returns bool
             */
            isLoaded: function() {
                return this.loaded;
            },

            /**
             * @returns bool
             */
            isLocal: function() {
                return this.local;
            },

            /**
             * @param {bool} state
             */
            setLocal: function(state) {
                this.local  = !!state;
            },

            /**
             * @returns bool
             */
            isLoading: function() {
                return this.loading;
            },

            /**
             * @returns bool
             */
            isFiltered: function() {
                return this.filtered;
            },

            /**
             * @returns bool
             */
            isSorted: function() {
                return this.sorted;
            },

            /**
             * @param {boolean} unfiltered
             * @returns number
             */
            getLength: function(unfiltered) {
                return unfiltered ? this.length : this.currentLength;
            },

            /**
             * @returns number
             */
            getTotalLength: function() {
                return this.totalLength || this.currentLength;
            },

            /**
             * @returns {boolean}
             */
            isEmpty: function() {
                return this.length === 0;
            },

            /**
             * @returns number
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
             * @param {string} k
             * @returns mixed
             */
            getParam: function(k) {
                return this.extraParams[k];
            },

            /**
             * @returns object
             */
            getParams: function() {
                return extend({}, this.extraParams);
            },

            /**
             * @returns void
             */
            clearParams: function() {
                this.extraParams = {};
            },

            /**
             * @param {number} val
             */
            setStart: function(val) {
                this.start = val;
            },

            /**
             * @param {number} val
             */
            setPageSize: function(val) {
                this.pageSize = val;
            },

            /**
             * @returns {object}
             */
            getAjaxData: function() {
                return this.ajaxData;
            },

            /**
             * @param {boolean} unfiltered
             * @returns bool
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
             * @param {boolean} unfiltered
             * @returns []
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
             * @returns MetaphorJs.Model
             */
            getModel: function() {
                return this.model;
            },


            /**
             * @returns []
             */
            toArray: function() {
                return this.current;
            },



            /**
             * initialize store with data from remote sever
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
             * @param {object} params optional
             * @param {object} options optional
             * @returns MetaphorJs.lib.Promise
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

            onLoad: emptyFn,
            onFailedLoad: emptyFn,

            /**
             * @returns MetaphorJs.lib.Promise
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
                    throw new Error("Nothing to save");
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

            onSave: emptyFn,
            onFailedSave: emptyFn,


            /**
             * @param {[]} ids
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.lib.Promise
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
                    if (rec instanceof Record) {
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


            onDelete: emptyFn,
            onFailedDelete: emptyFn,

            /**
             * @param {number} inx
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.lib.Promise
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
             * @param {MetaphorJs.model.Record} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.lib.Promise
             */
            "delete": function(rec, silent, skipUpdate) {
                var self    = this;
                return self.deleteById(self.getRecordId(rec), silent, skipUpdate);
            },

            /**
             * @param {MetaphorJs.model.Record[]} recs
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.lib.Promise
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
             * @param {function} cb
             * @param {object} cbScope
             * @param {object} options
             */
            loadOr: function(cb, cbScope, options) {

                var self    = this;

                if (self.local) {
                    return;
                }

                if (!self.isLoading()) {
                    if (!self.isLoaded()) {
                        self.load(null, options);
                    }
                    else if (cb) {
                        cb.call(cbScope || self);
                    }
                }
            },

            addPrevPage: function(options) {
                var self    = this;

                options = options || {};
                options.append = false;
                options.prepend = true;
                options.noopOnEmpty = true;

                return self.loadPrevPage(options);
            },

            /**
             * @method
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
            },

            /**
             * @method
             */
            loadNextPage: function(options) {

                var self    = this;

                if (!self.local && (!self.totalLength || self.length < self.totalLength)) {
                    self.start += self.pageSize;
                    return self.load(null, options);
                }
            },

            /**
             * @method
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
            },

            /**
             * @method
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
            },


            /**
             * @param {MetaphorJs.model.Record|Object} rec
             */
            getRecordId: function(rec) {
                if (rec instanceof Record) {
                    return rec.getId();
                }
                else if (this.model) {
                    return this.model.getRecordId(rec) || rec[this.idProp] || null;
                }
                else {
                    return rec[this.idProp] || null;
                }
            },

            getRecordData: function(rec) {
                return this.model.isPlain() ? rec : rec.data;
            },

            /**
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
                        r       = Model.getFromCache(type, id);
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

            bindRecord: function(mode, rec) {
                var self = this;
                rec[mode]("change", self.onRecordChange, self);
                rec[mode]("destroy", self.onRecordDestroy, self);
                rec[mode]("dirty-change", self.onRecordDirtyChange, self);
                return rec;
            },

            /**
             * @access protected
             * @param {MetaphorJs.model.Record|Object} rec
             */
            onRecordDirtyChange: function(rec) {
                this.trigger("update", this, rec);
            },

            /**
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
             * @access protected
             * @param {MetaphorJs.model.Record|Object} rec
             */
            onRecordDestroy: function(rec) {
                this.remove(rec);
            },





            /**
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @param {boolean} unfiltered
             * @returns {MetaphorJs.model.Record|Object|null}
             */
            shift: function(silent, skipUpdate, unfiltered) {
                return this.removeAt(0, 1, silent, skipUpdate, unfiltered);
            },

            /**
             * Works with unfiltered data
             * @param {{}|MetaphorJs.model.Record} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns {MetaphorJs.model.Record|Object}
             */
            unshift: function(rec, silent, skipUpdate) {
                return this.insert(0, rec, silent, skipUpdate);
            },

            /**
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @param {boolean} unfiltered
             * @returns {MetaphorJs.model.Record|Object|null}
             */
            pop: function(silent, skipUpdate, unfiltered) {
                return this.removeAt(this.length - 1, 1, silent, skipUpdate, unfiltered);
            },

            /**
             * Works with unfiltered data
             * @param {[]} recs
             * @param {boolean} silent
             * @param {boolean} skipUpdate
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
             * Works with unfiltered data
             * @param {MetaphorJs.model.Record|Object} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             */
            add: function(rec, silent, skipUpdate) {
                return this.insert(this.length, rec, silent, skipUpdate);
            },

            onAdd: emptyFn,

            /**
             * Works with both filtered and unfiltered
             * @param {number} index
             * @param {number} length = 1
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @param {boolean} unfiltered -- index from unfiltered item list
             * @returns MetaphorJs.model.Record|Object|null
             */
            removeAt: function(index, length, silent, skipUpdate, unfiltered) {

                var self    = this,
                    i       = 0,
                    l       = self.length;

                if (l === 0) {
                    return;
                }

                if (index == null) {
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

                    if (rec instanceof Record) {
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
             * @param {int} start
             * @param {int} end
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @param {boolean} unfiltered
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

            onRemove: emptyFn,

            /**
             * Works with unfiltered items
             * @param {number} index
             * @param {[]} recs
             * @param {boolean} silent
             * @param {boolean} skipUpdate
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
             * Works with unfiltered items
             * @param {number} index
             * @param {MetaphorJs.model.Record|Object} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.model.Record|Object
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
             * @param {MetaphorJs.model.Record|Object} old
             * @param {MetaphorJs.model.Record|Object} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.model.Record|Object
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

                if (!silent) {
                    self.trigger('replace', old, rec);
                }

                return rec;
            },


            replaceId: function(id, rec, silent, skipUpdate) {
                var self    = this,
                    index;

                index = self.indexOfId(id);

                return self.replace(self.getAt(index), rec);
            },

            onReplace: emptyFn,

            /**
             * @param {MetaphorJs.model.Record|Object} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.model.Record|Object|null
             */
            remove: function(rec, silent, skipUpdate) {
                var inx = this.indexOf(rec, true);
                if (inx !== -1) {
                    return this.removeAt(inx, 1, silent, skipUpdate, true);
                }
                return null;
            },

            /**
             * @param {string|int} id
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.model.Record|Object|null
             */
            removeId: function(id, silent, skipUpdate) {
                var inx = this.indexOfId(id, true);
                if (inx !== -1) {
                    return this.removeAt(inx, 1, silent, skipUpdate, true);
                }
            },



            /**
             * @param {MetaphorJs.model.Record|Object} rec
             * @param {boolean} unfiltered
             * @returns boolean
             */
            contains: function(rec, unfiltered) {
                return this.indexOf(rec, unfiltered) !== -1;
            },

            /**
             * @param {string|int} id
             * @param {boolean} unfiltered
             * @returns boolean
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
             * @method
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

            onClear: emptyFn,

            /**
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
             * @param {number} index
             * @param {boolean} unfiltered
             * @returns MetaphorJs.model.Record|Object|null
             */
            getAt: function(index, unfiltered) {
                return unfiltered ?
                       (this.items[index] || undf) :
                       (this.current[index] || undf);
            },

            /**
             * @param {string|int} id
             * @param {boolean} unfiltered
             * @returns MetaphorJs.model.Record|Object|null
             */
            getById: function(id, unfiltered) {
                return unfiltered ?
                       (this.map[id] || undf) :
                       (this.currentMap[id] || undf);
            },

            /**
             * Works with filtered list unless fromOriginal = true
             * @param {MetaphorJs.model.Record|Object} rec
             * @param {boolean} unfiltered
             * @returns Number
             */
            indexOf: function(rec, unfiltered) {
                return unfiltered ?
                       this.items.indexOf(rec) :
                       this.current.indexOf(rec);
            },

            /**
             * @param {string|int} id
             * @param {boolean} unfiltered
             * @returns Number
             */
            indexOfId: function(id, unfiltered) {
                return this.indexOf(this.getById(id, unfiltered), unfiltered);
            },

            /**
             * @param {function} fn {
             *      @param {MetaphorJs.model.Record|Object} rec
             *      @param {number} index
             *      @param {number} length
             * }
             * @param {object} context
             * @param {boolean} unfiltered
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
             * @param {function} fn {
             *      @param {string|number} id
             *      @param {number} index
             *      @param {number} length
             * }
             * @param {object} context
             * @param {boolean} unfiltered
             */
            eachId: function(fn, context, unfiltered) {

                var self    = this;

                self.each(function(rec, i, len){
                    return fn.call(context, self.getRecordId(rec), i, len);
                }, null, unfiltered);
            },

            /**
             * @param {string} f Field name
             * @param {boolean} unfiltered
             * @returns []
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
             * @param {boolean} unfiltered
             * @returns MetaphorJs.model.Record|Object
             */
            first : function(unfiltered){
                return unfiltered ? this.items[0] : this.current[0];
            },

            /**
             * @param {boolean} unfiltered
             * @returns MetaphorJs.model.Record|Object
             */
            last : function(unfiltered){
                return unfiltered ? this.items[this.length-1] : this.current[this.current-1];
            },

            /**
             *
             * @param {number} start Optional
             * @param {number} end Optional
             * @param {boolean} unfiltered
             * @returns MetaphorJs.model.Record[]|Object[]
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
             *
             * @param {function} fn {
             *      @param {MetaphorJs.model.Record|Object} rec
             *      @param {string|int} id
             * }
             * @param {object} context
             * @param {number} start { @default 0 }
             * @param {boolean} unfiltered
             * @returns MetaphorJs.model.Record|Object|null
             */
            findBy: function(fn, context, start, unfiltered) {
                var inx = this.findIndexBy(fn, context, start, unfiltered);
                return inx === -1 ? undf : this.getAt(inx, unfiltered);
            },

            /**
             *
             * @param {function} fn {
             *      @param {MetaphorJs.model.Record|Object} rec
             *      @param {string|int} id
             * }
             * @param {object} context
             * @param {number} start { @default 0 }
             * @param {boolean} unfiltered
             * @returns Number
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
             * @param {string} property
             * @param {string|int|bool} value
             * @param {bool} exact
             * @param {boolean} unfiltered
             * @returns Number
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
             * @param {string} property
             * @param {string|int|bool} value
             * @param {boolean} unfiltered
             * @returns number
             */
            findExact: function(property, value, unfiltered) {
                return this.find(property, value, true, unfiltered);
            },

            /**
             * @param {object} props
             * @param {boolean} unfiltered
             * @returns MetaphorJs.model.Record|Object|null
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
                    self.current        = sortArray(self.current, getterFn, self.sortDir);
                }

                self.trigger("update", self);
            },


            /**
             * @param {{}|string} by
             * @param {string|boolean} opt
             */
            filter: function(by, opt) {

                var self    = this;

                self.filtered       = true;
                self.filterBy       = by;
                self.filterOpt      = opt;

                self.update();
            },

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
             * @param {string} by
             * @param {string} dir
             */
            sort: function(by, dir) {
                var self = this;
                self.sorted = true;
                self.sortBy = by;
                self.sortDir = dir;
                self.update();
            },

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
             * @static
             * @param {string} id
             * @returns MetaphorJs.Store|null
             */
            lookupStore: function(id) {
                return allStores[id] || null;
            },


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