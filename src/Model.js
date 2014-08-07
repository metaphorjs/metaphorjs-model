
(function(){

"use strict";
var instances   = {},
    cache       = {},
    extend      = MetaphorJs.apply,
    ajax        = MetaphorJs.ajax,
    create      = MetaphorJs.create;


/**
 * @namespace MetaphorJs
 * @class MetaphorJs.data.Model
 */
MetaphorJs.define("MetaphorJs.data.Model", {

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

        extend(self, defaults, false);
        extend(self, cfg, true);

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
            cfg         = extend({}, typeof profile[type] == "string" ?
                            {url: profile[type]} : profile[type]),
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
        if (typeof cfg == "string") {
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
            profile[type] ? profile[type].extra : {}
        );

        /*if (!cfg.type) {
            cfg.type    = type == "load" ? "GET" : "POST";
        }*/
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

        if (sucProp && response[sucProp] != undefined) {
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

        var self    = this;/*,
            p       = ajax(self._createAjaxCfg("record", "load", id)),
            df      = new jQuery.Deferred;

        p.done(function(response){
                self._processRecordResponse("load", response, df);
            })
            .fail(df.reject);

        return df.promise();*/

        return ajax(self._createAjaxCfg("record", "load", id));
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
        return ajax(extend(this._createAjaxCfg("store", "load"), params, true));
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
            var type = typeof f == "string" ? f : f.type;

            switch (type) {
                case "int": {
                    value   = parseInt(value);
                    break;
                }
                case "bool":
                case "boolean": {
                    if (typeof value == "string") {
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
            var type = typeof f == "string" ? f : f.type;

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
            return create(model, cfg);
        }
        else {
            if (cfg) {
                return create(model, cfg);
            }
            else {
                if (instances[model]) {
                    return instances[model];
                }
                else {
                    return instances[model] = create(model);
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



}());