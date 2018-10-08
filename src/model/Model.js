
var extend  = require("metaphorjs-shared/src/func/extend.js"),
    cls = require("metaphorjs-class/src/cls.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js"),
    ajax = require("metaphorjs-ajax/src/func/ajax.js"),
    isString = require("metaphorjs-shared/src/func/isString.js"),
    isFunction = require("metaphorjs-shared/src/func/isFunction.js"),
    isThenable = require("metaphorjs-shared/src/func/isThenable.js"),
    undf = require("metaphorjs-shared/src/var/undf.js");

require("../__init.js");
require("metaphorjs-promise/src/lib/Promise.js");
require("metaphorjs-observable/src/mixin/Observable.js");


module.exports = MetaphorJs.model.Model = function(){

    "use strict";
    var instances   = {},
        cache       = {};

    /**
     * @class MetaphorJs.model.Model
     */
    return cls({

        $mixins:        [MetaphorJs.mixin.Observable],

        type:           null,
        fields:         null,
        record:         null,
        store:          null,
        plain:          false,

        lastAjaxResponse: null,



        /**
         * @constructor
         * @method $init
         * @param {object} cfg {
         *      Properties json,id,url,data,success,extra valid 
         *      on top level and inside all create/load/save/delete
         *      groups. Use string instead of object as shortcut
         *      for load.url/save.url etc.
         *      @type {string} type Record class
         *      @type {object} fields Fields conf
         *      @type {object} record {
         *          @type {string|object} create
                    @type {string|object} load
         *          @type {string|object} save
         *          @type {string|object} delete
         *      }
         *      @type {object} store {
         *          @type {string} total Total field
         *          @type {string} start Start field
         *          @type {string} limit Limit field
         *          @type {string|object} load
         *          @type {string|object} save
         *          @type {string|object} delete
         *      }
         *      @type {bool} json send data as json
         *      @type {string} url
         *      @type {string} id Id field
         *      @type {string} data Data field
         *      @type {string} success Success field 
         *      @type {object} extra Extra params object
         *      @type {string|int|bool} ... other $.ajax({ properties })
         * }
         */
        $init: function(cfg) {

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


            if (!self.fields) {
                self.fields = {};
            }

            extend(self, defaults, false, true);
            extend(self, cfg, true, true);

            self.plain      = !self.type;
        },

        /**
         * Do records within this model have type or they are plain objects
         * @method
         * @returns {bool}
         */
        isPlain: function() {
            return this.plain;
        },

        /**
         * @method
         * @param {string} type load|save|delete
         * @param {string} prop
         * @returns {*}
         */
        getRecordProp: function(type, prop) {
            return this.getProp("record", type, prop);
        },

        /**
         * @method
         * @param {string} prop
         * @param {string|int|bool} value
         */
        setRecordProp: function(prop, value) {
            this.record[prop] = value;
        },

        /**
         * @method
         * @param {string} type load|save|delete
         * @param {string} prop
         * @returns {*}
         */
        getStoreProp: function(type, prop) {
            return this.getProp("store", type, prop);
        },

        /**
         * @method
         * @param {string} prop
         * @param {string|int|bool} value
         */
        setStoreProp: function(prop, value) {
            this.store[prop] = value;
        },


        /**
         * @method
         * @param {string} what record|store
         * @param {string} type load|save|delete
         * @param {string} prop
         * @returns {*}
         */
        getProp: function(what, type, prop) {
            var profile = this[what];
            return (profile[type] && profile[type][prop]) || profile[prop] || this[prop] || null;
        },

        /**
         * @method
         * @param {string} prop
         * @param {string|int|bool} value
         */
        setProp: function(prop, value) {
            return this[prop] = value;
        },

        _prepareRequestUrl: function(url, data) {

            url = url.replace(/:([a-z0-9_\-]+)/gi, function(match, name){

                var value = data[name];

                if (value != undefined) {
                    delete data[name];
                    return value;
                }
                else {
                    return match;
                }

            });

            if (/:([a-z0-9_\-]+)/.test(url)) {
                return null;
            }

            return url;
        },

        _makeRequest: function(what, type, id, data) {

            var self        = this,
                profile     = self[what],
                cfg         = extend({},
                                    isString(profile[type]) || isFunction(profile[type]) ?
                                        {url: profile[type]} :
                                        profile[type]
                                    ),
                idProp      = self.getProp(what, type, "id"),
                dataProp    = self.getProp(what, type, "root"),
                url         = self.getProp(what, type, "url"),
                isJson      = self.getProp(what, type, "json"),
                res,
                ajaxCfg     = {};

            if (!cfg) {
                if (url) {
                    cfg     = {url: url};
                }
                else {
                    throw what + "." + type + " not defined";
                }
            }
            if (isString(cfg) || isFunction(cfg)) {
                cfg         = {url: cfg};
            }

            if (!cfg.url) {
                if (!url) {
                    throw what + "." + type + " url not defined";
                }
                cfg.url     = url;
            }

            ajaxCfg.url = cfg.url;

            if (cfg.ajax) {
                extend(ajaxCfg, cfg.ajax, true, false);
            }

            if (cfg.validate) {
                res = cfg.validate.call(self, id, data);
                if (res === false) {
                    return MetaphorJs.lib.Promise.reject(res);
                }
            }

            if (cfg.resolve) {
                res = cfg.resolve.call(self, id, data);
                if (res && isThenable(res)){
                    return res;
                }
                else if (res) {
                    return MetaphorJs.lib.Promise.resolve(res);
                }
            }

            ajaxCfg.data        = extend(
                {},
                cfg.data,
                self.extra,
                profile.extra,
                profile[type] ? profile[type].extra : null,
                ajaxCfg.data,
                data,
                true,
                true
            );

            if (isFunction(cfg.url)) {
                var df = cfg.url(ajaxCfg.data),
                    promise = new MetaphorJs.lib.Promise;

                df.then(function(response){
                    if (what == "record") {
                        self._processRecordResponse(type, response, promise);
                    }
                    else if (what == "store") {
                        self._processStoreResponse(type, response, promise);
                    }
                });

                return promise;
            }

            if (id && idProp) {
                ajaxCfg.data[idProp] = id;
            }

            if (data && dataProp && type != "load") {
                ajaxCfg.data[dataProp] = data;
            }

            ajaxCfg.url = self._prepareRequestUrl(ajaxCfg.url, ajaxCfg.data);

            if (!ajaxCfg.url) {
                return MetaphorJs.lib.Promise.reject();
            }

            if (!ajaxCfg.method) {
                if (what != "controller") {
                    ajaxCfg.method = type == "load" ? "GET" : "POST";
                }
                else {
                    ajaxCfg.method = "GET";
                }
            }

            if (isJson && ajaxCfg.data && ajaxCfg.method != 'GET') { // && cfg.type != 'GET') {
                ajaxCfg.contentType = "text/plain";
                ajaxCfg.data        = JSON.stringify(ajaxCfg.data);
            }

            ajaxCfg.context = self;

            var returnPromise;

            if (what == "record") {
                ajaxCfg.processResponse = function(response, deferred) {
                    self.lastAjaxResponse = response;
                    self._processRecordResponse(type, response, deferred);
                };
                returnPromise = self._processRecordRequest(ajax(ajaxCfg), type, id, data);
            }
            else if (what == "store") {
                ajaxCfg.processResponse = function(response, deferred) {
                    self.lastAjaxResponse = response;
                    self._processStoreResponse(type, response, deferred);
                };
                returnPromise = self._processStoreRequest(ajax(ajaxCfg), type, id, data);
            }
            else if (what == "controller") {
                ajaxCfg.processResponse = function(response, deferred) {
                    self.lastAjaxResponse = response;
                    self._processControllerResponse(type, response, deferred);
                };
                returnPromise = self._processControllerRequest(ajax(ajaxCfg), type, id, data);
            }

            if (cfg.processRequest) {
                cfg.processRequest.call(self, returnPromise, id, data);
            }

            return returnPromise;
        },

        _processRecordRequest: function(promise, type, id, data) {
            return promise;
        },

        _processRecordResponse: function(type, response, df) {
            var self        = this,
                idProp      = self.getRecordProp(type, "id"),
                dataProp    = self.getRecordProp(type, "root"),
                data        = dataProp ? response[dataProp] : response,
                id          = (data && data[idProp]) || response[idProp];

            if (!self._getSuccess("record", type, response)) {
                df.reject(response);
            }
            else {
                //df.resolve(id, data);
                df.resolve({id: id, data: self.extendPlainRecord(data)});
            }
        },

        _processStoreRequest: function(promise, type, id, data) {
            return promise;
        },

        _processStoreResponse: function(type, response, df) {
            var self        = this,
                dataProp    = self.getStoreProp(type, "root"),
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

        _processControllerRequest: function(promise, type, id, data) {
            return promise;
        },

        _processControllerResponse: function(type, response, df) {

            var self    = this;

            if (!self._getSuccess("controller", type, response)) {
                df.reject(response);
            }
            else {
                df.resolve(response);
            }
        },

        _getSuccess: function(what, type, response) {
            var self    = this,
                sucProp = self.getProp(what, type, "success");

            if (typeof sucProp == "function") {
                return sucProp(response);
            }

            if (sucProp && response[sucProp] != undf) {
                return response[sucProp];
            }
            else {
                return true;
            }
        },

        runController: function(name, id, data) {
            return this._makeRequest("controller", name, id, data);
        },


        /**
         * @method
         * @param {string|number} id Record id
         * @returns {MetaphorJs.lib.Promise}
         */
        loadRecord: function(id) {
            return this._makeRequest("record", "load", id);
        },

        /**
         * @method
         * @param {MetaphorJs.model.Record} rec
         * @param {array|null} keys
         * @param {object|null} extra
         * @returns {MetaphorJs.lib.Promise}
         */
        saveRecord: function(rec, keys, extra) {
            return this._makeRequest(
                "record",
                rec.getId() ? "save" : "create",
                rec.getId(),
                extend({}, rec.storeData(rec.getData(keys)), extra)
            );
        },

        /**
         * @method
         * @param {MetaphorJs.model.Record} rec
         * @returns {MetaphorJs.lib.Promise}
         */
        deleteRecord: function(rec) {
            return this._makeRequest("record", "delete", rec.getId());
        },

        /**
         * @method
         * @param {MetaphorJs.model.Store} store
         * @param {object} params
         * @returns {MetaphorJs.lib.Promise}
         */
        loadStore: function(store, params) {
            return this._makeRequest("store", "load", null, params);
        },

        /**
         * @method
         * @param {MetaphorJs.model.Store} store
         * @param {object} recordData
         * @returns {MetaphorJs.lib.Promise}
         */
        saveStore: function(store, recordData) {
            return this._makeRequest("store", "save", null, recordData);
        },

        /**
         * @method
         * @param {MetaphorJs.model.Store} store
         * @param {array} ids
         * @returns {MetaphorJs.lib.Promise}
         */
        deleteRecords: function(store, ids) {
            return this._makeRequest("store", "delete", ids);
        },



        /**
         * Takes plain object and extends with properties
         * defined in model.record.extend
         * @method
         * @returns {object}
         */
        extendPlainRecord: function(rec) {
            var self    = this,
                ext     = self.getRecordProp(null, "extend");

            return ext ? extend(rec, ext, false, false) : rec;
        },

        /**
         * @method
         * @returns {object}
         */
        getFields: function() {
            return this.fields;
        },

        /**
         * @method
         * @param {object} rec
         * @returns {*|null}
         */
        getRecordId: function(rec) {
            var idProp = this.getRecordProp("load", "id");
            return rec[idProp] || null;
        },

        /**
         * Convert field's value from database state to app state
         * @method
         * @param {MetaphorJs.model.Record} rec
         * @param {string} name
         * @param {string|int|bool|Date} value
         * @returns {*}
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
         * @method
         * @access protected
         * @param {MetaphorJs.model.Record} rec
         * @param {string} name
         * @param {string|int|bool} value
         * @returns {string|int|bool|Date}
         */
        onRestoreField: function(rec, name, value) {
            return value;
        },

        /**
         * Convert field's value from app state to database state
         * @method
         * @param {MetaphorJs.model.Record} rec
         * @param {string} name
         * @param {string|int|bool|Date} value
         * @returns {*}
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
         * @method
         * @access protected
         * @param {MetaphorJs.model.Record} rec
         * @param {string} name
         * @param {string|int|bool} value
         * @returns {string|int}
         */
        onStoreField: function(rec, name, value) {
            return value;
        }


    }, {

        /**
         * @static
         * @method
         * @param {string} model Model class name
         * @param {object} cfg Model config
         * @returns {object}
         */
        create: function(model, cfg) {

            if (model === "MetaphorJs.model.Model") {
                return cls.factory(model, cfg);
            }
            else {
                if (cfg) {
                    return cls.factory(model, cfg);
                }
                else {
                    if (instances[model]) {
                        return instances[model];
                    }
                    else {
                        return instances[model] = cls.factory(model);
                    }
                }
            }
        },

        /**
         * @static
         * @method
         * @param {MetaphorJs.model.Record} rec
         */
        addToCache: function(rec) {

            var id      = rec.getId(),
                cname   = rec.$getClass();

            if (!(rec instanceof MetaphorJs.model.Record) && 
                cname) {
                if (!cache[cname]) {
                    cache[cname] = {};
                }
                cache[cname][id] = rec;
            }
        },

        /**
         * @static
         * @method
         * @param {string} type Class name
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
         * @method
         * @param {string} type Class name
         * @param {string|int|bool} id
         */
        removeFromCache: function(type, id) {
            if (cache[type] && cache[type][id]) {
                delete cache[type][id];
            }
        }
    });
}();
