define("metaphorjs-model", ['metaphorjs-ajax', 'metaphorjs-promise', 'metaphorjs-namespace', 'metaphorjs-class', 'metaphorjs'], function(ajax, Promise, Namespace, Class, MetaphorJs) {


var defineClass = MetaphorJs.cs.define,
    factory     = MetaphorJs.cs.factory,
    isInstanceOf    = MetaphorJs.cs.isInstanceOf;


var slice = Array.prototype.slice;
var toString = Object.prototype.toString;
var undf = undefined;



var varType = function(){

    var types = {
        '[object String]': 0,
        '[object Number]': 1,
        '[object Boolean]': 2,
        '[object Object]': 3,
        '[object Function]': 4,
        '[object Array]': 5,
        '[object RegExp]': 9,
        '[object Date]': 10
    };


    /**
        'string': 0,
        'number': 1,
        'boolean': 2,
        'object': 3,
        'function': 4,
        'array': 5,
        'null': 6,
        'undefined': 7,
        'NaN': 8,
        'regexp': 9,
        'date': 10
    */

    return function(val) {

        if (!val) {
            if (val === null) {
                return 6;
            }
            if (val === undf) {
                return 7;
            }
        }

        var num = types[toString.call(val)];

        if (num === undf) {
            return -1;
        }

        if (num == 1 && isNaN(val)) {
            num = 8;
        }

        return num;
    };

}();


var isPlainObject = function(value) {
    return varType(value) === 3;
};


var isBool = function(value) {
    return varType(value) === 2;
};
var isNull = function(value) {
    return value === null;
};


/**
 * @param {Object} dst
 * @param {Object} src
 * @param {Object} src2 ... srcN
 * @param {boolean} override = false
 * @param {boolean} deep = false
 * @returns {*}
 */
var extend = function extend() {


    var override    = false,
        deep        = false,
        args        = slice.call(arguments),
        dst         = args.shift(),
        src,
        k,
        value;

    if (isBool(args[args.length - 1])) {
        override    = args.pop();
    }
    if (isBool(args[args.length - 1])) {
        deep        = override;
        override    = args.pop();
    }

    while (args.length) {
        if (src = args.shift()) {
            for (k in src) {

                if (src.hasOwnProperty(k) && (value = src[k]) !== undf) {

                    if (deep) {
                        if (dst[k] && isPlainObject(dst[k]) && isPlainObject(value)) {
                            extend(dst[k], value, override, deep);
                        }
                        else {
                            if (override === true || dst[k] == undf) { // == checks for null and undefined
                                if (isPlainObject(value)) {
                                    dst[k] = {};
                                    extend(dst[k], value, override, true);
                                }
                                else {
                                    dst[k] = value;
                                }
                            }
                        }
                    }
                    else {
                        if (override === true || dst[k] == undf) {
                            dst[k] = value;
                        }
                    }
                }
            }
        }
    }

    return dst;
};




var isString = function(value) {
    return varType(value) === 0;
};




var Model = function(){

    
    var instances   = {},
        cache       = {};


    /**
     * @namespace MetaphorJs
     * @class MetaphorJs.data.Model
     */
    return defineClass("MetaphorJs.data.Model", {

        type:           null,
        fields:         null,
        record:         null,
        store:          null,
        plain:          false,


        /**
         * @var object {
         *      @type {bool} json send data as json
         *      @type {string} url
         *      @type {string} id Id field
         *      @type {string} data Data field
         *      @type {string} success Success field
         *      @type {object} extra Extra params object
         *      @type {string|int|bool} ... other $.ajax({ properties })
         * }
         * @name atom
         * @md-tmp model-atom
         */

        /**
         * @var object {
         *      @type {string|object} load { @md-apply model-atom }
         *      @type {string|object} save { @md-apply model-atom }
         *      @type {string|object} delete { @md-apply model-atom }
         * }
         * @name group
         * @md-apply model-atom
         * @md-tmp model-group
         */

        /**
         * @constructor
         * @param {object} cfg {
         *      @type {string} type Record class
         *      @type {object} fields Fields conf
         *      @type {object} record {
         *          @type {string|object} create { @md-apply model-atom }
         *          @md-apply model-group
         *      }
         *      @type {object} store {
         *          @type {string} total Total field
         *          @type {string} start Start field
         *          @type {string} limit Limit field
         *          @md-apply model-group
         *      }
         *      @md-apply model-atom
         * }
         */
        initialize: function(cfg) {

            var self        = this,
                defaults    = {
                    record: {
                        load:       null,
                        save:       null,
                        "delete":   null,
                        id:         null,
                        data:       null,
                        success:    null,
                        extra:      {}
                    },

                    store: {
                        load:       null,
                        save:       null,
                        "delete":   null,
                        id:         null,
                        data:       null,
                        total:      null,
                        start:      null,
                        limit:      null,
                        success:    null,
                        extra:      {}
                    }
                };


            self.fields     = {};

            extend(self, defaults, false, true);
            extend(self, cfg, true, true);

            self.plain      = !self.type;
        },

        /**
         * Do records within this model have type or they are plain objects
         * @access public
         * @returns bool
         */
        isPlain: function() {
            return this.plain;
        },

        /**
         * @param {string} type load|save|delete
         * @param {string} prop
         * @returns mixed
         */
        getRecordProp: function(type, prop) {
            return this.getProp("record", type, prop);
        },

        /**
         * @param {string} prop
         * @param {string|int|bool} value
         */
        setRecordProp: function(prop, value) {
            this.record[prop] = value;
        },

        /**
         * @param {string} type load|save|delete
         * @param {string} prop
         * @returns mixed
         */
        getStoreProp: function(type, prop) {
            return this.getProp("store", type, prop);
        },

        /**
         * @param {string} prop
         * @param {string|int|bool} value
         */
        setStoreProp: function(prop, value) {
            this.store[prop] = value;
        },


        /**
         * @param {string} what record|store
         * @param {string} type load|save|delete
         * @param {string} prop
         * @returns mixed
         */
        getProp: function(what, type, prop) {
            var profile = this[what];
            return (profile[type] && profile[type][prop]) || profile[prop] || this[prop] || null;
        },

        /**
         * @param {string} prop
         * @param {string|int|bool} value
         */
        setProp: function(prop, value) {
            return this[prop] = value;
        },

        _createAjaxCfg: function(what, type, id, data) {

            var self        = this,
                profile     = self[what],
                cfg         = extend({},
                                    isString(profile[type]) ?
                                        {url: profile[type]} :
                                        profile[type]
                                    ),
                idProp      = self.getProp(what, type, "id"),
                dataProp    = self.getProp(what, type, "data"),
                url         = self.getProp(what, type, "url"),
                isJson      = self.getProp(what, type, "json");

            if (!cfg) {
                if (url) {
                    cfg     = {url: url};
                }
                else {
                    throw what + "." + type + " not defined";
                }
            }
            if (isString(cfg)) {
                cfg         = {url: cfg};
            }

            if (!cfg.url) {
                if (!url) {
                    throw what + "." + type + " url not defined";
                }
                cfg.url     = url;
            }

            cfg.data        = extend(
                {},
                cfg.data,
                self.extra,
                profile.extra,
                profile[type] ? profile[type].extra : {},
                false,
                true
            );

            if (!cfg.method) {
                cfg.method = type == "load" ? "GET" : "POST";
            }

            if (id) {
                cfg.data[idProp] = id;
            }
            if (data) {
                if (dataProp) {
                    cfg.data[dataProp] = data;
                }
                else {
                    cfg.data = data;
                }
            }

            if (isJson && cfg.data && cfg.method != 'GET') { // && cfg.type != 'GET') {
                cfg.data    = JSON.stringify(cfg.data);
            }

            cfg.callbackScope = self;

            if (what == "record") {
                cfg.processResponse = function(response, deferred) {
                    self._processRecordResponse(type, response, deferred);
                }
            }
            else if (what == "store") {
                cfg.processResponse = function(response, deferred) {
                    self._processStoreResponse(type, response, deferred);
                };
            }

            return cfg;
        },

        _processRecordResponse: function(type, response, df) {
            var self        = this,
                idProp      = self.getRecordProp(type, "id"),
                dataProp    = self.getRecordProp(type, "data"),
                data        = dataProp ? response[dataProp] : response,
                id          = (data && data[idProp]) || response[idProp];

            if (!self._getSuccess("record", type, response)) {
                df.reject(response);
            }
            else {
                //df.resolve(id, data);
                df.resolve({id: id, data: data});
            }
        },

        _processStoreResponse: function(type, response, df) {
            var self        = this,
                dataProp    = self.getStoreProp(type, "data"),
                totalProp   = self.getStoreProp(type, "total"),
                data        = dataProp ? response[dataProp] : response,
                total       = totalProp ? response[totalProp] : null;

            if (!self._getSuccess("store", type, response)) {
                df.reject(response);
            }
            else {
                //df.resolve(data, total);
                df.resolve({data: data, total: total});
            }
        },

        _getSuccess: function(what, type, response) {
            var self    = this,
                sucProp = self.getProp(what, type, "success");

            if (sucProp && response[sucProp] != undf) {
                return response[sucProp];
            }
            else {
                return true;
            }
        },

        /**
         * @access public
         * @param {string|number} id Record id
         * @returns MetaphorJs.lib.Promise
         */
        loadRecord: function(id) {
            return ajax(this._createAjaxCfg("record", "load", id));
        },

        /**
         * @access public
         * @param {MetaphorJs.data.Record} rec
         * @param {array|null} keys
         * @param {object|null} extra
         * @returns MetaphorJs.lib.Promise
         */
        saveRecord: function(rec, keys, extra) {
            return ajax(this._createAjaxCfg(
                "record",
                rec.getId() ? "save" : "create",
                rec.getId(),
                extend({}, rec.storeData(rec.getData(keys)), extra)
            ));
        },

        /**
         * @access public
         * @param {MetaphorJs.data.Record} rec
         * @returns MetaphorJs.lib.Promise
         */
        deleteRecord: function(rec) {
            return ajax(this._createAjaxCfg("record", "delete", rec.getId()));
        },

        /**
         * @access public
         * @param {MetaphorJs.data.Store} store
         * @param {object} params
         * @returns MetaphorJs.lib.Promise
         */
        loadStore: function(store, params) {
            return ajax(extend(this._createAjaxCfg("store", "load"), params, true, true));
        },

        /**
         * @access public
         * @param {MetaphorJs.data.Store} store
         * @param {object} recordData
         * @returns MetaphorJs.lib.Promise
         */
        saveStore: function(store, recordData) {
            return ajax(this._createAjaxCfg("store", "save", null, recordData));
        },

        /**
         * @access public
         * @param {MetaphorJs.data.Store} store
         * @param {array} ids
         * @returns MetaphorJs.lib.Promise
         */
        deleteRecords: function(store, ids) {
            return ajax(this._createAjaxCfg("store", "delete", ids));
        },


        /**
         * @returns object
         */
        getFields: function() {
            return this.fields;
        },

        /**
         * Convert field's value from database state to app state
         * @param {MetaphorJs.data.Record} rec
         * @param {string} name
         * @param {string|int|bool|Date} value
         * @returns mixed
         */
        restoreField: function(rec, name, value) {

            var self    = this,
                f       = self.fields[name];

            if (f) {
                var type = isString(f) ? f : f.type;

                switch (type) {
                    case "int": {
                        value   = parseInt(value);
                        break;
                    }
                    case "bool":
                    case "boolean": {
                        if (isString(value)) {
                            value   = value.toLowerCase();
                            value   = !(value === "off" || value === "no" || value === "0" ||
                                        value == "false" || value == "null");
                        }
                        else {
                            value = value ? true : false;
                        }
                        break;
                    }
                    case "double":
                    case "float": {
                        value   = parseFloat(value);
                        break;
                    }
                    case "date": {
                        if (f['parseFn']) {
                            value   = f['parseFn'](value, f.format);
                        }
                        else if (Date['parse']) {
                            value   = Date['parse'](value, f.format);
                        }
                        else {
                            if (f.format == "timestamp") {
                                value   = parseInt(value) * 1000;
                            }
                            value   = new Date(value);
                        }
                        break;
                    }
                }

                if (f.restore) {
                    value   = f.restore.call(rec, value, name);
                }
            }

            return self.onRestoreField(rec, name, value);
        },

        /**
         * @access protected
         * @param {MetaphorJs.data.Record} rec
         * @param {string} name
         * @param {string|int|bool} value
         * @returns string|int|bool|Date
         */
        onRestoreField: function(rec, name, value) {
            return value;
        },

        /**
         * Convert field's value from app state to database state
         * @param {MetaphorJs.data.Record} rec
         * @param {string} name
         * @param {string|int|bool|Date} value
         * @returns mixed
         */
        storeField: function(rec, name, value) {

            var self    = this,
                f       = self.fields[name];

            if (f) {
                var type = isString(f) ? f : f.type;

                switch (type) {
                    case "bool":
                    case "boolean": {
                        value   = value ? "1" : "0";
                        break;
                    }
                    case "date": {
                        if (f['formatFn']) {
                            value   = f['formatFn'](value, f.format);
                        }
                        else if (Date.format) {
                            value   = Date.format(value, f.format);
                        }
                        else {
                            if (f.format == "timestamp") {
                                value   = value.getTime() / 1000;
                            }
                            else {
                                value   = value['format'] ? value['format'](f.format) : value.toString();
                            }
                        }
                        break;
                    }
                    default: {
                        value   = value.toString();
                    }
                }

                if (f.store) {
                    value   = f.store.call(rec, value, name);
                }
            }

            return self.onStoreField(rec, name, value);

        },

        /**
         * @access protected
         * @param {MetaphorJs.data.Record} rec
         * @param {string} name
         * @param {string|int|bool} value
         * @returns string|int
         */
        onStoreField: function(rec, name, value) {
            return value;
        }


    }, {

        /**
         * @static
         * @returns Object
         */
        create: function(model, cfg) {

            if (model == "MetaphorJs.data.Model") {
                return factory(model, cfg);
            }
            else {
                if (cfg) {
                    return factory(model, cfg);
                }
                else {
                    if (instances[model]) {
                        return instances[model];
                    }
                    else {
                        return instances[model] = factory(model);
                    }
                }
            }
        },

        /**
         * @static
         * @param {MetaphorJs.data.Record} rec
         */
        addToCache: function(rec) {

            var cls     = rec.getClass(),
                id      = rec.getId();

            if (cls != "MetaphorJs.data.Record") {
                if (!cache[cls]) {
                    cache[cls] = {};
                }
                cache[cls][id] = rec;
            }
        },

        /**
         * @static
         * @param {string} type
         * @param {string|int|bool} id
         */
        getFromCache: function(type, id) {

            if (cache[type] && cache[type][id]) {
                return cache[type][id];
            }
            else {
                return null;
            }
        },

        /**
         * @static
         * @param {string} type
         * @param {string|int|bool} id
         */
        removeFromCache: function(type, id) {
            if (cache[type] && cache[type][id]) {
                delete cache[type][id];
            }
        }

    });



}();


var emptyFn = function(){};





/**
 * @namespace MetaphorJs
 * @class MetaphorJs.cmp.Base
 */
 defineClass("MetaphorJs.cmp.Base", {

    /**
     * @var bool
     * @access protected
     */
    destroyed:      false,

    /**
     * @var MetaphorJs.lib.Observable
     * @access private
     */
    _observable:    null,

    /**
     * @param {object} cfg
     */
    initialize: function(cfg) {

        var self    = this;
        cfg         = cfg || {};

        self._observable    = new Observable;
        extend(self, self._observable.getApi(), true, false);

        if (cfg.callback) {

            var cb      = cfg.callback,
                scope   = cb.scope || self;
            delete cb.scope;

            for (var k in cb) {
                if (cb.hasOwnProperty(k)) {
                    self.on(k, cb[k], scope);
                }
            }

            delete cfg.callback;
        }

        extend(self, cfg, true, false);
    },

    /**
     * @method
     */
    destroy:    function() {

        var self    = this;

        if (self.destroyed) {
            return;
        }

        if (self.trigger('beforedestroy', self) === false) {
            return false;
        }

        self.onDestroy();
        self.destroyed  = true;

        self.trigger('destroy', self);

        self._observable.destroy();
        delete this._observable;

    },

    /**
     * @method
     * @access protected
     */
    onDestroy:      emptyFn
});







/**
 * @namespace MetaphorJs
 * @class MetaphorJs.data.Record
 * @extends MetaphorJs.cmp.Observable
 */
var Record = defineClass("MetaphorJs.data.Record", "MetaphorJs.cmp.Base", {

    /**
     * @var mixed
     * @access protected
     */
    id:             null,

    /**
     * @var object
     * @access protected
     */
    data:           null,

    /**
     * @var object
     * @access protected
     */
    orig:           null,

    /**
     * @var object
     * @access protected
     */
    modified:       null,

    /**
     * @var bool
     * @access protected
     */
    loaded:         false,

    /**
     * @var bool
     * @access protected
     */
    dirty:          false,

    /**
     * @var bool
     * @access protected
     */
    destroyed:      false,

    /**
     * @var MetaphorJs.data.Model
     * @access protected
     */
    model:          null,

    /**
     * @var bool
     * @access protected
     */
    standalone:     true,

    /**
     * @var array
     * @access protected
     */
    stores:         null,

    /**
     * @constructor
     * @method initialize
     * @param {*} id
     * @param {object} cfg
     */

    /**
     * @constructor
     * @method initialize
     * @param {object} cfg
     */

    /**
     * @constructor
     * @param {string|int|null} id
     * @param {object} data
     * @param {object} cfg
     */
    initialize: function(id, data, cfg) {

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
        self.supr(cfg);

        if (isString(self.model)) {
            self.model  = factory(self.model);
        }
        else if (!isInstanceOf(self.model, "MetaphorJs.data.Model")) {
            self.model  = factory("MetaphorJs.data.Model", self.model);
        }

        self.id     = id;

        if (data) {
            self.importData(data);
        }
        else if(cfg.autoLoad !== false && id) {
            self.load();
        }

        if (self.getClass() != "MetaphorJs.data.Record") {
            Model.addToCache(self);
        }
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
    isStandalone: function() {
        return this.standalone;
    },

    /**
     * @returns bool
     */
    isDirty: function() {
        return this.dirty;
    },

    /**
     * @returns {MetaphorJs.data.Model}
     */
    getModel: function() {
        return this.model;
    },

    /**
     * @param {MetaphorJs.data.Store} store
     */
    attachStore: function(store) {
        var self    = this,
            sid     = store.getId();

        if (self.stores.indexOf(sid) == -1) {
            self.stores.push(sid);
        }
    },

    /**
     * @param {MetaphorJs.data.Store} store
     */
    detachStore: function(store) {
        var self    = this,
            sid     = store.getId(),
            inx;

        if (!self.destroyed && (inx = self.stores.indexOf(sid)) != -1) {
            self.stores.splice(inx, 1);

            if (self.stores.length == 0 && !self.standalone) {
                self.destroy();
            }
        }
    },

    /**
     * @param {bool} dirty
     */
    setDirty: function(dirty) {
        var self    = this;
        if (self.dirty != dirty) {
            self.dirty  = !!dirty;
            self.trigger("dirtychange", self, dirty);
        }
    },

    /**
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
     * @access protected
     * @param {object} data
     * @returns object
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
     * @returns mixed
     */
    getId: function() {
        return this.id;
    },

    /**
     * @param {[]|null|string} keys
     * @returns object
     */
    getData: function(keys) {
        if (keys) {
            var data = {}, i, len,
                self    = this;

            keys = isString(keys) ? [keys] : keys;

            for (i = 0, len = keys.length; i < len; i++) {
                data[keys[i]] = self.data[keys[i]];
            }
            return data;
        }
        else {
            return extend({}, this.data);
        }
    },

    /**
     * @returns object
     */
    getChanged: function() {
        return extend({}, this.modified);
    },

    /**
     * @param {string} key
     * @returns bool
     */
    isChanged: function(key) {
        return this.modified[key] || false;
    },

    /**
     * @param {string} key
     * @returns *
     */
    get: function(key) {
        return this.data[key];
    },

    /**
     * @param {*} id
     */
    setId: function(id) {
        if (!this.id && id) {
            this.id = id;
        }
    },

    /**
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
        self.trigger("beforeload", self);
        return self.model.loadRecord(self.id)
            .done(function(response) {
                self.setId(response.id);
                self.importData(response.data);
                self.trigger("load", self);
            })
            .fail(function() {
                self.trigger("failedload", self);
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
        self.trigger("beforesave", self);
        return self.model.saveRecord(self, keys, extra)
            .done(function(response) {
                self.setId(response.id);
                self.importData(response.data);
                self.trigger("save", self);
            })
            .fail(function(response) {
                self.trigger("failedsave", self);
            });
    },

    /**
     * @method
     * @returns {MetaphorJs.lib.Promise}
     */
    "delete": function() {
        var self    = this;
        self.trigger("beforedelete", self);
        return self.model.deleteRecord(self)
            .done(function() {
                self.trigger("delete", self);
                self.destroy();
            }).
            fail(function() {
                self.trigger("faileddelete", self);
            });
    },


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



    destroy: function() {

        var self    = this;

        if (self.destroyed) {
            return;
        }

        self.destroyed  = true;

        self.trigger("destroy", self);

        self.data       = null;
        self.orig       = null;
        self.modified   = null;
        self.model      = null;
        self.stores     = null;

        Model.removeFromCache(self.getClass(), self.id);

        self.supr();
    }

});




/**
 * @param {*} value
 * @returns {boolean}
 */
var isArray = function(value) {
    return varType(value) === 5;
};


var isNumber = function(value) {
    return varType(value) === 1;
};




 (function(){


    var storeId     = 0;
    var allStores   = {};



    /**
     * @namespace MetaphorJs
     * @class MetaphorJs.data.Store
     * @extends MetaphorJs.cmp.Observable
     */
    return defineClass("MetaphorJs.data.Store", "MetaphorJs.cmp.Base", {

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

                if (url && !isString(url)) {
                    initialData = options;
                    options     = url;
                    url         = null;
                }

                options         = options || {};

                self.supr(options);

                self.id             = self.id || ++storeId;
                allStores[self.id]  = self;

                if (isString(self.model)) {
                    self.model  = factory(self.model);
                }
                else if (!isInstanceOf(self.model, Model)) {
                    self.model  = factory("MetaphorJs.data.Model", self.model);
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
             * @returns MetaphorJs.lib.Promise
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
                    .fail(function(reason) {
                        self.onFailedLoad();
                        self.trigger("failedload", self, reason);
                    });
            },

            onLoad: emptyFn,
            onFailedLoad: emptyFn,

            /**
             * @returns MetaphorJs.lib.Promise
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
             * @returns MetaphorJs.lib.Promise
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
             * @returns MetaphorJs.lib.Promise
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
             * @returns MetaphorJs.lib.Promise
             */
            "delete": function(rec) {
                var self    = this;
                return self.deleteById(self.getRecordId(rec));
            },

            /**
             * @param {MetaphorJs.data.Record[]} recs
             * @returns MetaphorJs.lib.Promise
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
                        r       = factory(type, id, item, {
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

                if (!isString(id) && !isNumber(id)) {

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

                if (id != undf){
                    var old = self.map[id];
                    if(old != undf){
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
                    if(id != undf){
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
                if(id != undf){
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

                if(id == undf || old == undf){
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
                return this.map[id] !== undf;
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
                end = Math.min(end == undf ? self.length-1 : end, self.length-1);
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
                var s   = factory("MetaphorJs.data.Store", {server: {load: {id: 0}}});
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
return MetaphorJs.data;
});
