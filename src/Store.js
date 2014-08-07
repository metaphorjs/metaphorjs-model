
(function(){

"use strict";

var storeId     = 0;
var allStores   = {};


var create      = MetaphorJs.create,
    isArray     = MetaphorJs.isArray,
    Record      = MetaphorJs.data.Record,
    Model       = MetaphorJs.data.Model,
    is          = MetaphorJs.is,
    emptyFn     = MetaphorJs.emptyFn,
    extend      = MetaphorJs.apply;


/**
 * @namespace MetaphorJs
 * @class MetaphorJs.data.Store
 * @extends MetaphorJs.cmp.Observable
 */
MetaphorJs.d("MetaphorJs.data.Store", "MetaphorJs.cmp.Base", {

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
         * @var {MetaphorJs.data.Model}
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
         * @var {object}
         * @access protected
         */
        map:            null,

        /**
         * @var {object}
         * @access protected
         */
        keys:           null,

        /**
         * @var {number}
         * @access protected
         */
        length:         0,

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
         * @var {object}
         * @access protected
         */
        filterBackup:   null,

        /**
         * @access protected
         * @param {MetaphorJs.data.Record|Object} rec
         * @param {string|int} id
         * @param {[]} params
         */
        filterFn:       null,

        /**
         * @var {object}
         * @access protected
         */
        filterScope:    null,

        /**
         * @var {[]}
         * @access protected
         */
        filterParams:   null,


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
        initialize:     function(url, options, initialData) {

            var self        = this;

            self.items      = [];
            self.map        = {};
            self.keys       = [];
            self.loaded     = false;
            self.extraParams    = self.extraParams || {};

            if (url && typeof url != "string") {
                initialData = options;
                options     = url;
                url         = null;
            }

            options         = options || {};

            self.supr(options);

            self.id             = self.id || ++storeId;
            allStores[self.id]  = self;

            if (typeof self.model == "string") {
                self.model  = create(self.model);
            }
            else if (!is(self.model, Model)) {
                self.model  = create("MetaphorJs.data.Model", self.model);
            }

            if (url || options.url) {
                self.model.store.load    = url || options.url;
            }


            if (!self.local && self.autoLoad) {
                self.load();
            }
            else if (initialData) {
                if (isArray(initialData)) {
                    self.loadArray(initialData);
                }
                else {
                    self.loadAjaxData(initialData);
                }
            }

            if (self.local) {
                self.loaded     = true;
            }
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
         * @returns number
         */
        getLength: function() {
            return this.length;
        },

        /**
         * @returns number
         */
        getTotalLength: function() {
            return this.filtered ?
                        this.length : (this.totalLength || this.length);
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
            this.extraParams[k] = v;
        },

        /**
         * @param {string} k
         * @returns mixed
         */
        getParam: function(k) {
            return this.extraParams[k];
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
         * @returns bool
         */
        hasDirty: function() {
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
            });
            return ret;
        },

        /**
         * @returns []
         */
        getDirty: function() {
            var recs    = [];
            if (this.model.isPlain()) {
                return recs;
            }
            this.each(function(rec){
                if (rec.isDirty()) {
                    recs.push(rec);
                }
            });
            return recs;
        },

        /**
         * @returns MetaphorJs.data.Model
         */
        getModel: function() {
            return this.model;
        },

        /**
         * @param {[]} recs
         */
        importData: function(recs) {
            var self    = this;

            self.suspendAllEvents();

            for (var i = 0; i < recs.length; i++) {
                self.add(recs[i]);
            }

            self.resumeAllEvents();

            self.loaded     = true;
            self.loading    = false;

            self.onLoad();
            self.trigger("load", self);
        },

        /**
         * @param {object} params
         * @returns jQuery.Deferred
         */
        load: function(params) {

            var self    = this,
                ms      = self.model.store,
                sp      = ms.start,
                lp      = ms.limit;

            if (self.local) {
                return null;
            }

            params      = extend({}, self.extraParams, params || {});

            if (self.pageSize !== null && !params[sp] && !params[lp]) {
                params[sp]    = self.start;
                params[lp]    = self.pageSize;
            }

            if (self.trigger("beforeload", self) === false) {
                return null;
            }

            return self.model.loadStore(self, params)
                .done(function(response) {
                    self.totalLength    = parseInt(response.total);
                    self.importData(response.data);
                    self.totalLength    = parseInt(response.total);
                })
                .fail(function() {
                    self.onFailedLoad();
                    self.trigger("failedload", self);
                });
        },

        onLoad: emptyFn,
        onFailedLoad: emptyFn,

        /**
         * @returns jQuery.Deferred
         */
        save: function() {

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

            if (self.trigger("beforesave", self, recs) === false) {
                return null;
            }

            return self.model.saveStore(self, recs)
                .done(function(response) {

                    var i, len,
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
                    self.trigger("save", self);
                })
                .fail(function() {
                    self.onFailedSave();
                    self.trigger("failedsave", self);
                });
        },

        onSave: emptyFn,
        onFailedSave: emptyFn,


        /**
         * @param {[]} ids
         * @returns jQuery.Deferred
         */
        deleteById: function(ids) {

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
                if (rec instanceof Record) {
                    rec.destroy();
                }
                else {
                    self.removeId(ids[i]);
                }
            }

            if (self.trigger("beforedelete", self, ids) === false) {
                return null;
            }

            return self.model.deleteRecords(self, ids)
                .done(function() {
                    self.onDelete();
                    self.trigger("delete", self, ids);
                })
                .fail(function() {
                    self.onFailedDelete();
                    self.trigger("faileddelete", self, ids);
                });
        },

        onDelete: emptyFn,
        onFailedDelete: emptyFn,

        /**
         * @param {number} inx
         * @returns jQuery.Deferred
         */
        deleteAt: function(inx) {
            var self    = this,
                rec     = self.getAt(inx);

            if (!rec) {
                throw new Error("Record not found at " + inx);
            }
            return self.deleteRecord(rec);
        },

        /**
         * @param {MetaphorJs.data.Record} rec
         * @returns jQuery.Deferred
         */
        "delete": function(rec) {
            var self    = this;
            return self.deleteById(self.getRecordId(rec));
        },

        /**
         * @param {MetaphorJs.data.Record[]} recs
         * @returns jQuery.Deferred
         */
        deleteRecords: function(recs) {
            var ids     = [],
                self    = this,
                i, len;

            for (i = 0, len = recs.length; i < len; i++) {
                ids.push(self.getRecordId(recs[i]));
            }

            return self.deleteById(ids);
        },

        /**
         * @param {object} data
         */
        loadAjaxData: function(data) {

            var self    = this;

            if (self.trigger("beforeload", self) === false) {
                return;
            }

            self.model._processStoreResponse("load", data, {
                resolve: function(data, total) {
                    self.importData(data);
                    self.totalLength    = parseInt(total);
                },
                reject: function() {

                }
            });
        },

        /**
         * @param {[]} recs
         * @param {bool} add
         */
        loadArray: function(recs, add) {

            var self    = this;

            if (self.trigger("beforeload", self) === false) {
                return;
            }

            if (!add && self.clearOnLoad && self.length > 0) {
                self.clear();
            }

            if (isArray(recs)) {
                self.importData(recs);
                self.totalLength    = self.length;
            }
        },

        /**
         * Load store if not loaded or call provided callback
         * @param {function} cb
         * @param {object} cbScope
         */
        loadOr: function(cb, cbScope) {

            var self    = this;

            if (self.local) {
                return;
            }

            if (!self.isLoading()) {
                if (!self.isLoaded()) {
                    self.load();
                }
                else if (cb) {
                    cb.call(cbScope || self);
                }
            }
        },

        /**
         * @method
         */
        addNextPage: function() {

            var self    = this;

            if (!self.local && self.length < self.totalLength) {
                self.load({
                    start:      self.length,
                    limit:      self.pageSize
                }, true);
            }
        },

        /**
         * @method
         */
        loadNextPage: function() {

            var self    = this;

            if (!self.local) {
                self.start += self.pageSize;
                self.load();
            }
        },

        /**
         * @method
         */
        loadPrevPage: function() {

            var self    = this;

            if (!self.local) {
                self.start -= self.pageSize;
                self.load();
            }
        },




        /**
         * @param {MetaphorJs.data.Record|Object} rec
         */
        getRecordId: function(rec) {
            if (rec instanceof Record) {
                return rec.getId();
            }
            else {
                return rec[this.model.getStoreProp("load", "id")] || null;
            }
        },

        /**
         * @access protected
         * @param {MetaphorJs.data.Record|Object} item
         * @returns MetaphorJs.data.Record|Object
         */
        processRawDataItem: function(item) {

            var self    = this;

            if (item instanceof Record) {
                return item;
            }

            if (self.model.isPlain()) {
                return item;
            }
            else {

                var type    = self.model.type,
                    id      = self.getRecordId(item),
                    r;

                if (id) {
                    r       = Model.getFromCache(type, id);
                }

                if (!r) {
                    r       = create(type, id, item, {
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
            rec[mode]("dirtychange", self.onRecordDirtyChange, self);
            return rec;
        },

        /**
         * @access protected
         * @param {MetaphorJs.data.Record|Object} rec
         */
        onRecordDirtyChange: function(rec) {
            this.trigger("update", this, rec);
        },

        /**
         * @access protected
         * @param {MetaphorJs.data.Record|Object} rec
         * @param {string} k
         * @param {string|int|bool} v
         * @param {string|int|bool} prev
         */
        onRecordChange: function(rec, k, v, prev) {
            this.trigger("update", this, rec);
        },

        /**
         * @access protected
         * @param {MetaphorJs.data.Record|Object} rec
         */
        onRecordDestroy: function(rec) {
            this.remove(rec);
        },


        /**
         *
         * @param {string|int} id
         * @param {MetaphorJs.data.Record|Object} rec
         * @param {bool} silent
         */
        add: function(id, rec, silent) {

            var self    = this;

            if (self.filtered) {
                throw "Cannot add to filtered store";
            }

            if (typeof id != "string" && typeof id != "number") {

                rec = arguments[0];

                if (isArray(rec)) {

                    if (!rec.length) {
                        return;
                    }

                    var prevLength  = self.length;

                    for (var i = 0, len = rec.length; i < len; i++) {
                        rec[i]  = self.processRawDataItem(rec[i]);
                        self.add(self.getRecordId(rec[i]), rec[i], true);
                    }

                    self.onAdd(prevLength, rec);

                    if (!silent) {
                        self.trigger('add', prevLength, rec);
                    }
                    return;
                }
                else {
                    rec = self.processRawDataItem(rec);
                    id  = self.getRecordId(rec);
                }
            }

            if (typeof id != 'undefined' && id !== null){
                var old = self.map[id];
                if(typeof old != 'undefined'){
                    self.replace(id, rec);
                    return;
                }
                self.map[id] = rec;
            }

            self.length++;
            self.items.push(rec);
            self.keys.push(id);

            if (rec instanceof Record) {
                rec.attachStore(self);
                self.bindRecord("on", rec);
            }

            self.onAdd(self.length - 1, [rec]);
            if (!silent) {
                self.trigger('add', self.length - 1, [rec]);
            }
        },

        onAdd: emptyFn,

        /**
         * @param {number} index
         * @returns MetaphorJs.data.Record|Object|null
         */
        removeAt: function(index) {

            var self    = this;

            if(index < self.length && index >= 0){
                self.length--;
                self.totalLength--;
                var rec = self.items[index];
                self.items.splice(index, 1);
                var id = self.keys[index];
                if(typeof id != 'undefined'){
                    delete self.map[id];
                }
                self.keys.splice(index, 1);
                self.onRemove(rec, id);
                self.trigger('remove', rec, id);

                if (rec instanceof Record) {
                    self.bindRecord("un", rec);
                    rec.detachStore(self);
                    return rec = null;
                }
                else {
                    return rec;
                }
            }
            return false;
        },

        onRemove: emptyFn,

        /**
         * @param {number} index
         * @param {string|int} id
         * @param {MetaphorJs.data.Record|Object} rec
         * @param {bool} silent
         * @returns MetaphorJs.data.Record|Object
         */
        insert: function(index, id, rec, silent) {
            var self = this;

            if (self.filtered) {
                throw new Error("Cannot insert into filtered store");
            }

            if(arguments.length == 2){
                rec = arguments[1];
                id = self.getRecordId(rec);
            }
            rec = self.processRawDataItem(rec);
            if(self.containsId(id)){
                self.suspendAllEvents();
                self.removeId(id);
                self.resumeAllEvents();
            }
            if(index >= self.length){
                return self.add(id, rec, silent);
            }
            self.length++;
            self.items.splice(index, 0, rec);
            if(typeof id != 'undefined' && id !== null){
                self.map[id] = rec;
            }
            self.keys.splice(index, 0, id);

            if (rec instanceof Record) {
                rec.attachStore(self);
                self.bindRecord("on", rec);
            }

            self.onAdd(index, [rec]);
            if (!silent) {
                self.trigger('add', index, [rec]);
            }

            return rec;
        },

        /**
         * @param {string|int} id
         * @param {MetaphorJs.data.Record|Object} rec
         * @returns MetaphorJs.data.Record|Object
         */
        replace: function(id, rec) {
            var self    = this,
                old,
                index;

            if(arguments.length == 1){
                rec     = arguments[0];
                id      = self.getRecordId(rec);
            }

            rec         = self.processRawDataItem(rec);
            old         = self.map[id];

            if(typeof id == 'undefined' || id === null || typeof old == 'undefined'){
                return self.add(id, rec);
            }

            if (old instanceof Record) {
                self.bindRecord("un", old);
                old.detachStore(self);
            }

            index               = self.indexOfId(id);
            self.items[index]   = rec;
            self.map[id]        = rec;

            if (rec instanceof Record) {
                self.bindRecord("on", rec);
                rec.attachStore(self);
            }

            self.onReplace(id, old, rec);
            self.trigger('replace', id, old, rec);
            return rec;
        },

        onReplace: emptyFn,

        /**
         * @param {MetaphorJs.data.Record|Object} rec
         * @returns MetaphorJs.data.Record|Object|null
         */
        remove: function(rec) {
            return this.removeAt(this.indexOf(rec));
        },

        /**
         * @param {string|int} id
         * @returns MetaphorJs.data.Record|Object|null
         */
        removeId: function(id) {
            return this.removeAt(this.indexOfId(id));
        },

        /**
         * @param {MetaphorJs.data.Record|Object} rec
         * @returns bool
         */
        contains: function(rec) {
            return this.indexOf(rec) != -1;
        },

        /**
         * @param {string|int} id
         * @returns bool
         */
        containsId: function(id) {
            return typeof this.map[id] != 'undefined';
        },

        /**
         * @method
         */
        clear: function() {

            var self    = this,
                recs    = self.getRange();

            self.clearFilter(true);
            self._reset();
            self.onClear();
            self.trigger('clear', recs);
        },

        onClear: emptyFn,

        /**
         * @method
         */
        reset: function() {
            this._reset();
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

            self.start          = 0;
            self.length         = 0;
            self.totalLength    = 0;
            self.items          = [];
            self.keys           = [];
            self.map            = {};
            self.loaded         = self.local;
        },


        /**
         * @param {function} fn {
         *      @param {MetaphorJs.data.Record|Object} rec
         *      @param {string|int} id
         *      @param {[]} params
         * }
         * @param {object} fnScope
         * @param {[]} params
         */
        filter: function(fn, fnScope, params) {

            var self    = this;

            if (self.filtered) {
                self.clearFilter(true);
            }

            self.filtered       = true;
            self.filterFn       = fn;
            self.filterScope    = fnScope;
            self.filterParams   = params;

            self.trigger("beforefilter", self);
            self.suspendAllEvents();

            self.filterBackup   = {
                length:         self.length,
                items:          self.items,
                keys:           self.keys,
                map:            self.map
            };

            self._reset(true);

            var k   = self.filterBackup.keys,
                it  = self.filterBackup.items;

            for(var i = 0, len = it.length; i < len; i++){
                if(self._filterRecord(it[i], k[i])){
                    self.items.push(it[i]);
                    self.keys.push(k[i]);
                    self.length++;
                    self.map[k[i]] = it[i];
                }
            }

            self.resumeAllEvents();
            self.onFilter();
            self.trigger("filter", self);
        },

        onFilter: emptyFn,

        _filterRecord: function(rec, id) {
            var self    = this;
            return self.filtered &&
                self.filterFn.call(self.filterScope, rec, id, self.filterParams);
        },

        /**
         * @param {bool} silent
         */
        clearFilter: function(silent) {

            var self    = this;

            if (!self.filtered) {
                return;
            }

            if (!silent) {
                self.trigger("beforeclearfilter", self);
            }

            self.suspendAllEvents();

            self.filtered       = false;
            self._reset(true);

            self.length         = self.filterBackup.length;
            self.items          = self.filterBackup.items;
            self.keys           = self.filterBackup.keys;
            self.map            = self.filterBackup.map;
            self.filterBackup   = null;

            self.resumeAllEvents();

            self.onClearFilter();
            if (!silent) {
                self.trigger("clearfilter", self);
            }
        },

        onClearFilter: emptyFn,


        /**
         * @param {number} index
         * @returns MetaphorJs.data.Record|Object|null
         */
        getAt: function(index) {
            return this.items[index] || null;
        },

        /**
         * @param {string|int} id
         * @returns MetaphorJs.data.Record|Object|null
         */
        getById: function(id) {
            return this.map[id] || null;
        },

        /**
         * @param {MetaphorJs.data.Record|Object} rec
         * @returns Number
         */
        indexOf: function(rec) {
            return this.items.indexOf(rec);
        },

        /**
         * @param {string|int} id
         * @returns Number
         */
        indexOfId: function(id) {
            return this.keys.indexOf(id);
        },

        /**
         * @param {function} fn {
         *      @param {MetaphorJs.data.Record|Object} rec
         *      @param {number} index
         *      @param {number} length
         * }
         * @param {object} fnScope
         */
        each: function(fn, fnScope) {
            var items = [].concat(this.items);
            fnScope = fnScope || window;
            for(var i = 0, len = items.length; i < len; i++){
                if(fn.call(fnScope, items[i], i, len) === false){
                    break;
                }
            }
        },

        /**
         * @param {function} fn {
         *      @param {MetaphorJs.data.Record|Object} rec
         *      @param {number} index
         *      @param {number} length
         * }
         * @param {object} fnScope
         */
        eachId: function(fn, fnScope) {
            var self    = this;
            fnScope = fnScope || window;
            for(var i = 0, len = self.keys.length; i < len; i++){
                fn.call(fnScope, self.keys[i], self.items[i], i, len);
            }
        },

        /**
         * @param {string} f Field name
         * @returns []
         */
        collect: function(f) {

            var coll    = [],
                self    = this,
                rt      = !self.model.isPlain();

            self.each(function(rec){

                var val;

                if (rt) {
                    val = rec.get(f);
                }
                else {
                    val = rec[f];
                }

                if (val) {
                    coll.push(val);
                }
            });

            return coll;
        },

        /**
         * @returns MetaphorJs.data.Record|Object
         */
        first : function(){
            return this.items[0];
        },

        /**
         * @returns MetaphorJs.data.Record|Object
         */
        last : function(){
            return this.items[this.length-1];
        },

        /**
         *
         * @param {number} start Optional
         * @param {number} end Optional
         * @returns MetaphorJs.data.Record[]|Object[]
         */
        getRange : function(start, end){
            var self    = this;
            var items   = self.items;
            if(items.length < 1){
                return [];
            }
            start = start || 0;
            end = Math.min(typeof end == 'undefined' || end === null ? self.length-1 : end, self.length-1);
            var i, r = [];
            if(start <= end){
                for(i = start; i <= end; i++) {
                    r[r.length] = items[i];
                }
            }else{
                for(i = start; i >= end; i--) {
                    r[r.length] = items[i];
                }
            }
            return r;
        },

        /**
         *
         * @param {function} fn {
         *      @param {MetaphorJs.data.Record|Object} rec
         *      @param {string|int} id
         * }
         * @param {object} fnScope
         * @param {number} start { @default 0 }
         * @returns MetaphorJs.data.Record|Object|null
         */
        findBy: function(fn, fnScope, start) {
            var inx = this.findIndexBy(fn, fnScope, start);
            return inx == -1 ? null : this.getAt(inx);
        },

        /**
         *
         * @param {function} fn {
         *      @param {MetaphorJs.data.Record|Object} rec
         *      @param {string|int} id
         * }
         * @param {object} fnScope
         * @param {number} start { @default 0 }
         * @returns Number
         */
        findIndexBy : function(fn, fnScope, start) {

            fnScope = fnScope || this;

            var k   = this.keys,
                it  = this.items;

            for(var i = (start||0), len = it.length; i < len; i++){
                if(fn.call(fnScope, it[i], k[i])){
                    return i;
                }
            }

            return -1;
        },

        /**
         * @param {string} property
         * @param {string|int|bool} value
         * @param {bool} exact
         * @returns Number
         */
        find: function(property, value, exact) {

            var self    = this,
                rt      = !self.model.isPlain(),
                v;

            return self.findIndexBy(function(rec) {

                if (rt) {
                    v   = rec.get(property);
                }
                else {
                    v   = rec[property];
                }

                if (exact) {
                    return v === value;
                }
                else {
                    return v == value;
                }

            }, self);
        },

        /**
         * @param {string} property
         * @param {string|int|bool} value
         * @returns number
         */
        findExact: function(property, value) {
            return this.find(property, value, true);
        },

        /**
         * @param {object} props
         * @returns MetaphorJs.data.Record|Object|null
         */
        findBySet: function(props) {

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
            });

            return found;
        },





        onDestroy: function() {

            var self    = this;

            delete allStores[self.id];

            self.clear();
            self.supr();
        }

    },

    {
        /**
         * @static
         * @param {DOMElement} selectObj
         * @returns MetaphorJs.data.Store
         */
        createFromSelect: function(selectObj) {
            var d = [], opts = selectObj.options;
            for(var i = 0, len = opts.length;i < len; i++){
                var o = opts[i],
                    value = (o.hasAttribute ? o.hasAttribute('value') : o.getAttributeNode('value').specified) ?
                                o.value : o.text;
                d.push([value, o.text]);
            }
            var s   = create("MetaphorJs.data.Store", {server: {load: {id: 0}}});
            s.loadArray(d);
            return s;
        },

        /**
         * @static
         * @param {string} id
         * @returns MetaphorJs.data.Store|null
         */
        lookupStore: function(id) {
            return allStores[id] || null;
        },


        eachStore: function(fn, fnScope) {

            var id;

            for (id in allStores) {
                if (fn.call(fnScope || window, allStores[id]) === false) {
                    break;
                }
            }
        }
    }
);




}());