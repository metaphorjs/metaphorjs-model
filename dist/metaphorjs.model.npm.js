
module.exports = function (window) {

var ajax = require("metaphorjs-ajax")(window),
Promise = require("metaphorjs-promise"),
Namespace = require("metaphorjs-namespace"),
Class = require("metaphorjs-class");
/* BUNDLE START 347 */
"use strict";


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


    /*
     * 'string': 0,
     * 'number': 1,
     * 'boolean': 2,
     * 'object': 3,
     * 'function': 4,
     * 'array': 5,
     * 'null': 6,
     * 'undefined': 7,
     * 'NaN': 8,
     * 'regexp': 9,
     * 'date': 10,
     * unknown: -1
     * @param {*} value
     * @returns {number}
     */



    return function varType(val) {

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

        if (num === 1 && isNaN(val)) {
            return 8;
        }

        return num;
    };

}();



function isPlainObject(value) {
    // IE < 9 returns [object Object] from toString(htmlElement)
    return typeof value == "object" &&
           varType(value) === 3 &&
            !value.nodeType &&
            value.constructor === Object;

};

function isBool(value) {
    return value === true || value === false;
};




var extend = function(){

    /**
     * @param {Object} dst
     * @param {Object} src
     * @param {Object} src2 ... srcN
     * @param {boolean} override = false
     * @param {boolean} deep = false
     * @returns {object}
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
            // IE < 9 fix: check for hasOwnProperty presence
            if ((src = args.shift()) && src.hasOwnProperty) {
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

    return extend;
}();

function isFunction(value) {
    return typeof value == 'function';
};



function isString(value) {
    return typeof value == "string" || value === ""+value;
    //return typeof value == "string" || varType(value) === 0;
};



/**
 * @param {*} value
 * @returns {boolean}
 */
function isArray(value) {
    return typeof value === "object" && varType(value) === 5;
};

var strUndef = "undefined";



function isObject(value) {
    if (value === null || typeof value != "object") {
        return false;
    }
    var vt = varType(value);
    return vt > 2 || vt == -1;
};



var Cache = function(){

    var globalCache;

    /**
     * @class Cache
     */

    /**
     * @constructor
     * @param {bool} cacheRewritable
     */
    var Cache = function(cacheRewritable) {

        var storage = {},

            finders = [];

        if (arguments.length == 0) {
            cacheRewritable = true;
        }

        return {

            /**
             * @param {function} fn
             * @param {object} context
             * @param {bool} prepend
             */
            addFinder: function(fn, context, prepend) {
                finders[prepend? "unshift" : "push"]({fn: fn, context: context});
            },

            /**
             * @method
             * @param {string} name
             * @param {*} value
             * @param {bool} rewritable
             * @returns {*} value
             */
            add: function(name, value, rewritable) {

                if (storage[name] && storage[name].rewritable === false) {
                    return storage[name];
                }

                storage[name] = {
                    rewritable: typeof rewritable != strUndef ? rewritable : cacheRewritable,
                    value: value
                };

                return value;
            },

            /**
             * @method
             * @param {string} name
             * @returns {*}
             */
            get: function(name) {

                if (!storage[name]) {
                    if (finders.length) {

                        var i, l, res,
                            self = this;

                        for (i = 0, l = finders.length; i < l; i++) {

                            res = finders[i].fn.call(finders[i].context, name, self);

                            if (res !== undf) {
                                return self.add(name, res, true);
                            }
                        }
                    }

                    return undf;
                }

                return storage[name].value;
            },

            /**
             * @method
             * @param {string} name
             * @returns {*}
             */
            remove: function(name) {
                var rec = storage[name];
                if (rec && rec.rewritable === true) {
                    delete storage[name];
                }
                return rec ? rec.value : undf;
            },

            /**
             * @method
             * @param {string} name
             * @returns {boolean}
             */
            exists: function(name) {
                return !!storage[name];
            },

            /**
             * @param {function} fn
             * @param {object} context
             */
            eachEntry: function(fn, context) {
                var k;
                for (k in storage) {
                    fn.call(context, storage[k].value, k);
                }
            },

            /**
             * @method
             */
            destroy: function() {

                var self = this;

                if (self === globalCache) {
                    globalCache = null;
                }

                storage = null;
                cacheRewritable = null;

                self.add = null;
                self.get = null;
                self.destroy = null;
                self.exists = null;
                self.remove = null;
            }
        };
    };

    /**
     * @method
     * @static
     * @returns {Cache}
     */
    Cache.global = function() {

        if (!globalCache) {
            globalCache = new Cache(true);
        }

        return globalCache;
    };

    return Cache;

}();


function emptyFn(){};



var instantiate = function(fn, args) {

    var Temp = function(){},
        inst, ret;

    Temp.prototype  = fn.prototype;
    inst            = new Temp;
    ret             = fn.apply(inst, args);

    // If an object has been returned then return it otherwise
    // return the original instance.
    // (consistent with behaviour of the new operator)
    return isObject(ret) || ret === false ? ret : inst;

};
/**
 * Function interceptor
 * @param {function} origFn
 * @param {function} interceptor
 * @param {object|null} context
 * @param {object|null} origContext
 * @param {string} when
 * @param {bool} replaceValue
 * @returns {Function}
 */
function intercept(origFn, interceptor, context, origContext, when, replaceValue) {

    when = when || "before";

    return function() {

        var intrRes,
            origRes;

        if (when == "instead") {
            return interceptor.apply(context || origContext, arguments);
        }
        else if (when == "before") {
            intrRes = interceptor.apply(context || origContext, arguments);
            origRes = intrRes !== false ? origFn.apply(origContext || context, arguments) : null;
        }
        else {
            origRes = origFn.apply(origContext || context, arguments);
            intrRes = interceptor.apply(context || origContext, arguments);
        }

        return replaceValue ? intrRes : origRes;
    };
};


var MetaphorJs = {


};




var ns = new Namespace(MetaphorJs, "MetaphorJs");



var cs = new Class(ns);





var defineClass = cs.define;

function getAttr(el, name) {
    return el.getAttribute ? el.getAttribute(name) : null;
};

/**
 * @param {Function} fn
 * @param {*} context
 */
var bind = Function.prototype.bind ?
              function(fn, context){
                  return fn.bind(context);
              } :
              function(fn, context) {
                  return function() {
                      return fn.apply(context, arguments);
                  };
              };





/**
 * @function trim
 * @param {String} value
 * @returns {string}
 */
var trim = function() {
    // native trim is way faster: http://jsperf.com/angular-trim-test
    // but IE doesn't have it... :-(
    if (!String.prototype.trim) {
        return function(value) {
            return isString(value) ? value.replace(/^\s\s*/, '').replace(/\s\s*$/, '') : value;
        };
    }
    return function(value) {
        return isString(value) ? value.trim() : value;
    };
}();
/**
 * @param {Function} fn
 * @param {Object} context
 * @param {[]} args
 * @param {number} timeout
 */
function async(fn, context, args, timeout) {
    return setTimeout(function(){
        fn.apply(context, args || []);
    }, timeout || 0);
};



var parseJSON = function() {

    return typeof JSON != strUndef ?
           function(data) {
               return JSON.parse(data);
           } :
           function(data) {
               return (new Function("return " + data))();
           };
}();





function parseXML(data, type) {

    var xml, tmp;

    if (!data || !isString(data)) {
        return null;
    }

    // Support: IE9
    try {
        tmp = new DOMParser();
        xml = tmp.parseFromString(data, type || "text/xml");
    } catch (thrownError) {
        xml = undf;
    }

    if (!xml || xml.getElementsByTagName("parsererror").length) {
        throw "Invalid XML: " + data;
    }

    return xml;
};



/**
 * @param {*} list
 * @returns {[]}
 */
function toArray(list) {
    if (list && !list.length != undf && list !== ""+list) {
        for(var a = [], i =- 1, l = list.length>>>0; ++i !== l; a[i] = list[i]){}
        return a;
    }
    else if (list) {
        return [list];
    }
    else {
        return [];
    }
};


var nextUid = function(){
    var uid = ['0', '0', '0'];

    // from AngularJs
    /**
     * @returns {String}
     */
    return function nextUid() {
        var index = uid.length;
        var digit;

        while(index) {
            index--;
            digit = uid[index].charCodeAt(0);
            if (digit == 57 /*'9'*/) {
                uid[index] = 'A';
                return uid.join('');
            }
            if (digit == 90  /*'Z'*/) {
                uid[index] = '0';
            } else {
                uid[index] = String.fromCharCode(digit + 1);
                return uid.join('');
            }
        }
        uid.unshift('0');
        return uid.join('');
    };
}();





/**
 * This class is private - you can't create an event other than via Observable.
 * See {@link class:Observable} reference.
 * @class ObservableEvent
 * @private
 */
var ObservableEvent = function(name, options) {

    var self    = this;

    self.name           = name;
    self.listeners      = [];
    self.map            = {};
    self.hash           = nextUid();
    self.uni            = '$$' + name + '_' + self.hash;
    self.suspended      = false;
    self.lid            = 0;

    if (typeof options === "object" && options !== null) {
        extend(self, options, true, false);
    }
    else {
        self.returnResult = options;
    }
};


extend(ObservableEvent.prototype, {

    name: null,
    listeners: null,
    map: null,
    hash: null,
    uni: null,
    suspended: false,
    lid: null,
    returnResult: null,
    autoTrigger: null,
    lastTrigger: null,
    triggerFilter: null,
    filterContext: null,
    expectPromises: false,
    resolvePromises: false,

    /**
     * Get event name
     * @method
     * @returns {string}
     */
    getName: function() {
        return this.name;
    },

    /**
     * @method
     */
    destroy: function() {
        var self        = this,
            k;

        for (k in self) {
            self[k] = null;
        }
    },

    /**
     * @method
     * @param {function} fn Callback function { @required }
     * @param {object} context Function's "this" object
     * @param {object} options See {@link class:Observable.on}
     */
    on: function(fn, context, options) {

        if (!fn) {
            return null;
        }

        context     = context || null;
        options     = options || {};

        var self        = this,
            uni         = self.uni,
            uniContext  = fn || context;

        if (uniContext[uni] && !options.allowDupes) {
            return null;
        }

        var id      = ++self.lid,
            first   = options.first || false;

        uniContext[uni]  = id;

        var e = {
            fn:         fn,
            context:    context,
            uniContext: uniContext,
            id:         id,
            async:      false,
            called:     0, // how many times the function was triggered
            limit:      0, // how many times the function is allowed to trigger
            start:      1, // from which attempt it is allowed to trigger the function
            count:      0, // how many attempts to trigger the function was made
            append:     null, // append parameters
            prepend:    null // prepend parameters
        };

        extend(e, options, true, false);

        if (e.async === true) {
            e.async = 1;
        }

        if (first) {
            self.listeners.unshift(e);
        }
        else {
            self.listeners.push(e);
        }

        self.map[id] = e;

        if (self.autoTrigger && self.lastTrigger && !self.suspended) {
            var prevFilter = self.triggerFilter;
            self.triggerFilter = function(l){
                if (l.id === id) {
                    return prevFilter ? prevFilter(l) !== false : true;
                }
                return false;
            };
            self.trigger.apply(self, self.lastTrigger);
            self.triggerFilter = prevFilter;
        }

        return id;
    },

    /**
     * @method
     * @param {function} fn Callback function { @required }
     * @param {object} context Function's "this" object
     * @param {object} options See {@link class:Observable.on}
     */
    once: function(fn, context, options) {

        options = options || {};
        options.limit = 1;

        return this.on(fn, context, options);
    },

    /**
     * @method
     * @param {function} fn Callback function { @required }
     * @param {object} context Callback context
     */
    un: function(fn, context) {

        var self        = this,
            inx         = -1,
            uni         = self.uni,
            listeners   = self.listeners,
            id;

        if (fn == parseInt(fn)) {
            id      = parseInt(fn);
        }
        else {
            context = context || fn;
            id      = context[uni];
        }

        if (!id) {
            return false;
        }

        for (var i = 0, len = listeners.length; i < len; i++) {
            if (listeners[i].id === id) {
                inx = i;
                delete listeners[i].uniContext[uni];
                break;
            }
        }

        if (inx === -1) {
            return false;
        }

        listeners.splice(inx, 1);
        delete self.map[id];
        return true;
    },

    /**
     * @method hasListener
     * @return bool
     */

    /**
     * @method
     * @param {function} fn Callback function { @required }
     * @param {object} context Callback context
     * @return boolean
     */
    hasListener: function(fn, context) {

        var self    = this,
            listeners   = self.listeners,
            id;

        if (fn) {

            context = context || fn;

            if (!isFunction(fn)) {
                id  = parseInt(fn);
            }
            else {
                id  = context[self.uni];
            }

            if (!id) {
                return false;
            }

            for (var i = 0, len = listeners.length; i < len; i++) {
                if (listeners[i].id === id) {
                    return true;
                }
            }

            return false;
        }
        else {
            return listeners.length > 0;
        }
    },


    /**
     * @method
     */
    removeAllListeners: function() {
        var self    = this,
            listeners = self.listeners,
            uni     = self.uni,
            i, len;

        for (i = 0, len = listeners.length; i < len; i++) {
            delete listeners[i].uniContext[uni];
        }
        self.listeners   = [];
        self.map         = {};
    },

    /**
     * @method
     */
    suspend: function() {
        this.suspended = true;
    },

    /**
     * @method
     */
    resume: function() {
        this.suspended = false;
    },


    _prepareArgs: function(l, triggerArgs) {
        var args;

        if (l.append || l.prepend) {
            args    = slice.call(triggerArgs);
            if (l.prepend) {
                args    = l.prepend.concat(args);
            }
            if (l.append) {
                args    = args.concat(l.append);
            }
        }
        else {
            args = triggerArgs;
        }

        return args;
    },

    /**
     * @method
     * @return {*}
     */
    trigger: function() {

        var self            = this,
            listeners       = self.listeners,
            rr              = self.returnResult,
            filter          = self.triggerFilter,
            filterContext   = self.filterContext,
            expectPromises  = self.expectPromises,
            results         = [],
            prevPromise,
            resPromise,
            args, 
            resolver;

        if (self.suspended) {
            return null;
        }

        if (self.autoTrigger) {
            self.lastTrigger = slice.call(arguments);
        }

        if (listeners.length === 0) {
            return null;
        }

        var ret     = rr === "all" || rr === "concat" ?
                        [] : 
                        (rr === "merge" ? {} : null),
            q, l,
            res;

        if (rr === "first") {
            q = [listeners[0]];
        }
        else {
            // create a snapshot of listeners list
            q = slice.call(listeners);
        }

        // now if during triggering someone unsubscribes
        // we won't skip any listener due to shifted
        // index
        while (l = q.shift()) {

            // listener may already have unsubscribed
            if (!l || !self.map[l.id]) {
                continue;
            }

            args = self._prepareArgs(l, arguments);

            if (filter && filter.call(filterContext, l, args, self) === false) {
                continue;
            }

            if (l.filter && l.filter.apply(l.filterContext || l.context, args) === false) {
                continue;
            }

            l.count++;

            if (l.count < l.start) {
                continue;
            }

            if (l.async && !expectPromises) {
                res = null;
                async(l.fn, l.context, args, l.async);
            }
            else {
                if (expectPromises) {
                    resolver = function(l, rr, args){
                        return function(value) {

                            if (rr === "pipe") {
                                args[0] = value;
                                args = self._prepareArgs(l, args);
                            }
                            
                            return l.fn.apply(l.context, args);
                        }
                    }(l, rr, slice.call(arguments));

                    if (prevPromise) {
                        res = prevPromise.then(resolver);
                    }
                    else {
                        res = l.fn.apply(l.context, args);
                    }

                    res.catch(function(err){
                        console.log(err);
                    });
                }
                else {
                    res = l.fn.apply(l.context, args);
                }
            }

            l.called++;

            if (l.called === l.limit) {
                self.un(l.id);
            }

            // This rule is valid in all cases sync and async.
            // It either returns first value or first promise.
            if (rr === "first") {
                return res;
            }
        
            // Promise branch
            if (expectPromises) {
            
                // we collect all results for further processing/resolving
                results.push(res);

                if (rr === "pipe" && res) {
                    prevPromise = res;
                }
            }
            else {
                if (rr !== null) {
                    if (rr === "all") {
                        ret.push(res);
                    }
                    else if (rr === "concat" && res) {
                        ret = ret.concat(res);
                    }
                    else if (rr === "merge") {
                        extend(ret, res, true, false);
                    }
                    else if (rr === "nonempty" && res) {
                        return res;
                    }
                    else if (rr === "pipe") {
                        ret = res;
                        arguments[0] = res;
                    }
                    else if (rr === "last") {
                        ret = res;
                    }
                    else if (rr === false && res === false) {
                        return false;
                    }
                    else if (rr === true && res === true) {
                        return true;
                    }
                }
            }
        }

        if (expectPromises) {
            resPromise = Promise.all(results);
            if (self.resolvePromises && rr !== null && rr !== "all") {
                resPromise = resPromise.then(function(values){
                    var i, l = values.length, res;
                    for(i = 0; i < l; i++) {
                        res = values[i];
                        if (rr === "concat" && res) {
                            ret = ret.concat(res);
                        }
                        else if (rr === "merge") {
                            extend(ret, res, true, false);
                        }
                        else if (rr === "nonempty" && res) {
                            return res;
                        }
                        else if (rr === false && res === false) {
                            return false;
                        }
                        else if (rr === true && res === true) {
                            return true;
                        }
                    }
                    return ret;
                });
            }
            return resPromise;
        }
        else return ret;
    }
}, true, false);







/**
 * Returns 'then' function or false
 * @param {*} any
 * @returns {Function|boolean}
 */
function isThenable(any) {

    // any.then must only be accessed once
    // this is a promise/a+ requirement

    if (!any) { //  || !any.then
        return false;
    }
    var then, t;

    //if (!any || (!isObject(any) && !isFunction(any))) {
    if (((t = typeof any) != "object" && t != "function")) {
        return false;
    }
    return isFunction((then = any.then)) ?
           then : false;
};



var error = (function(){

    var listeners = [];

    var error = function error(e) {

        var i, l;

        for (i = 0, l = listeners.length; i < l; i++) {
            if (listeners[i][0].call(listeners[i][1], e) === false) {
                return;
            }
        }

        var stack = (e ? e.stack : null) || (new Error).stack;

        if (typeof console != strUndef && console.error) {
            //async(function(){
                if (e) {
                    console.error(e);
                }
                if (stack) {
                    console.error(stack);
                }
            //});
        }
        else {
            throw e;
        }
    };

    error.on = function(fn, context) {
        error.un(fn, context);
        listeners.push([fn, context]);
    };

    error.un = function(fn, context) {
        var i, l;
        for (i = 0, l = listeners.length; i < l; i++) {
            if (listeners[i][0] === fn && listeners[i][1] === context) {
                listeners.splice(i, 1);
                break;
            }
        }
    };

    return error;
}());



function setAttr(el, name, value) {
    return el.setAttribute(name, value);
};



// partly from jQuery serialize.js

var serializeParam = function(){

    var r20 = /%20/g,
        rbracket = /\[\]$/;

    function buildParams(prefix, obj, add) {
        var name,
            i, l, v;

        if (isArray(obj)) {
            // Serialize array item.

            for (i = 0, l = obj.length; i < l; i++) {
                v = obj[i];

                if (rbracket.test(prefix)) {
                    // Treat each array item as a scalar.
                    add(prefix, v);

                } else {
                    // Item is non-scalar (array or object), encode its numeric index.
                    buildParams(
                        prefix + "[" + ( typeof v === "object" ? i : "" ) + "]",
                        v,
                        add
                    );
                }
            }
        } else if (isPlainObject(obj)) {
            // Serialize object item.
            for (name in obj) {
                buildParams(prefix + "[" + name + "]", obj[ name ], add);
            }

        } else {
            // Serialize scalar item.
            add(prefix, obj);
        }
    }

    return function(obj) {

        var prefix,
            s = [],
            add = function( key, value ) {
                // If value is a function, invoke it and return its value
                value = isFunction(value) ? value() : (value == null ? "" : value);
                s[s.length] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
            };

        for ( prefix in obj ) {
            buildParams(prefix, obj[prefix], add);
        }

        // Return the resulting serialization
        return s.join( "&" ).replace( r20, "+" );
    };


}();


/**
 * @mixin Promise
 */
ns.register("mixin.Promise", {

    $$promise: null,

    $beforeInit: function() {
        this.$$promise = new Promise;
    },

    then: function(){
        return this.$$promise.then.apply(this.$$promise, arguments);
    },

    done: function() {
        this.$$promise.done.apply(this.$$promise, arguments);
        return this;
    },

    always: function() {
        this.$$promise.always.apply(this.$$promise, arguments);
        return this;
    },

    fail: function() {
        this.$$promise.fail.apply(this.$$promise, arguments);
        return this;
    }

});




(function(){



    var accepts     = {
            xml:        "application/xml, text/xml",
            html:       "text/html",
            script:     "text/javascript, application/javascript",
            json:       "application/json, text/javascript",
            text:       "text/plain",
            _default:   "*/*"
        },

        createXHR       = function() {

            var xhr;

            if (!window.XMLHttpRequest || !(xhr = new XMLHttpRequest())) {
                if (!(xhr = new ActiveXObject("Msxml2.XMLHTTP"))) {
                    if (!(xhr = new ActiveXObject("Microsoft.XMLHTTP"))) {
                        throw "Unable to create XHR object";
                    }
                }
            }

            return xhr;
        },

        httpSuccess     = function(r) {
            try {
                return (!r.status && location && location.protocol == "file:")
                       || (r.status >= 200 && r.status < 300)
                       || r.status === 304 || r.status === 1223; // || r.status === 0;
            } catch(thrownError){}
            return false;
        };

    return defineClass({

        $class: "ajax.transport.XHR",

        type: "xhr",
        _xhr: null,
        _deferred: null,
        _ajax: null,

        $init: function(opt, deferred, ajax) {

            var self    = this,
                xhr;

            self._xhr = xhr     = createXHR();
            self._deferred      = deferred;
            self._opt           = opt;
            self._ajax          = ajax;

            if (opt.progress) {
                xhr.onprogress = bind(opt.progress, opt.context);
            }
            if (opt.uploadProgress && xhr.upload) {
                xhr.upload.onprogress = bind(opt.uploadProgress, opt.context);
            }

            xhr.onreadystatechange = bind(self.onReadyStateChange, self);
        },

        setHeaders: function() {

            var self = this,
                opt = self._opt,
                xhr = self._xhr,
                i;

            if (opt.xhrFields) {
                for (i in opt.xhrFields) {
                    xhr[i] = opt.xhrFields[i];
                }
            }
            if (opt.data && opt.contentType) {
                xhr.setRequestHeader("Content-Type", opt.contentType);
            }
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            xhr.setRequestHeader("Accept",
                opt.dataType && accepts[opt.dataType] ?
                accepts[opt.dataType] + ", */*; q=0.01" :
                accepts._default
            );
            for (i in opt.headers) {
                xhr.setRequestHeader(i, opt.headers[i]);
            }

        },

        onReadyStateChange: function() {

            var self        = this,
                xhr         = self._xhr,
                deferred    = self._deferred;

            if (xhr.readyState === 0) {
                xhr.onreadystatechange = emptyFn;
                deferred.resolve(xhr);
                return;
            }

            if (xhr.readyState === 4) {
                xhr.onreadystatechange = emptyFn;

                if (httpSuccess(xhr)) {

                    self._ajax.processResponse(
                        isString(xhr.responseText) ? xhr.responseText : undf,
                        xhr.getResponseHeader("content-type") || ''
                    );
                }
                else {

                    xhr.responseData = null;

                    try {
                        xhr.responseData = self._ajax.returnResponse(
                            isString(xhr.responseText) ? xhr.responseText : undf,
                            xhr.getResponseHeader("content-type") || ''
                        );
                    }
                    catch (thrownErr) {}

                    deferred.reject(xhr);
                }
            }
        },

        abort: function() {
            var self    = this;
            self._xhr.onreadystatechange = emptyFn;
            self._xhr.abort();
        },

        send: function() {

            var self    = this,
                opt     = self._opt;

            try {
                self._xhr.open(opt.method, opt.url, true, opt.username, opt.password);
                self.setHeaders();
                self._xhr.send(opt.data);
            }
            catch (thrownError) {
                if (self._deferred) {
                    self._deferred.reject(thrownError);
                }
            }
        }
    });

}());




function returnFalse() {
    return false;
};


function returnTrue() {
    return true;
};

function isNull(value) {
    return value === null;
};



// from jQuery

var DomEvent = function(src) {

    if (src instanceof DomEvent) {
        return src;
    }

    // Allow instantiation without the 'new' keyword
    if (!(this instanceof DomEvent)) {
        return new DomEvent(src);
    }


    var self    = this;

    for (var i in src) {
        if (!self[i]) {
            try {
                self[i] = src[i];
            }
            catch (thrownError){}
        }
    }


    // Event object
    self.originalEvent = src;
    self.type = src.type;

    if (!self.target && src.srcElement) {
        self.target = src.srcElement;
    }


    var eventDoc, doc, body,
        button = src.button;

    // Calculate pageX/Y if missing and clientX/Y available
    if (self.pageX === undf && !isNull(src.clientX)) {
        eventDoc = self.target ? self.target.ownerDocument || window.document : window.document;
        doc = eventDoc.documentElement;
        body = eventDoc.body;

        self.pageX = src.clientX +
                      ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) -
                      ( doc && doc.clientLeft || body && body.clientLeft || 0 );
        self.pageY = src.clientY +
                      ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) -
                      ( doc && doc.clientTop  || body && body.clientTop  || 0 );
    }

    // Add which for click: 1 === left; 2 === middle; 3 === right
    // Note: button is not normalized, so don't use it
    if ( !self.which && button !== undf ) {
        self.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
    }

    // Events bubbling up the document may have been marked as prevented
    // by a handler lower down the tree; reflect the correct value.
    self.isDefaultPrevented = src.defaultPrevented ||
                              src.defaultPrevented === undf &&
                                  // Support: Android<4.0
                              src.returnValue === false ?
                              returnTrue :
                              returnFalse;


    // Create a timestamp if incoming event doesn't have one
    self.timeStamp = src && src.timeStamp || (new Date).getTime();
};

// Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
extend(DomEvent.prototype, {

    isDefaultPrevented: returnFalse,
    isPropagationStopped: returnFalse,
    isImmediatePropagationStopped: returnFalse,

    preventDefault: function() {
        var e = this.originalEvent;

        this.isDefaultPrevented = returnTrue;
        e.returnValue = false;

        if ( e && e.preventDefault ) {
            e.preventDefault();
        }
    },
    stopPropagation: function() {
        var e = this.originalEvent;

        this.isPropagationStopped = returnTrue;
        e.cancelBubble = true;

        if ( e && e.stopPropagation ) {
            e.stopPropagation();
        }
    },
    stopImmediatePropagation: function() {
        var e = this.originalEvent;

        this.isImmediatePropagationStopped = returnTrue;

        if ( e && e.stopImmediatePropagation ) {
            e.stopImmediatePropagation();
        }

        this.stopPropagation();
    }
}, true, false);




function normalizeEvent(originalEvent) {
    return new DomEvent(originalEvent);
};


// from jquery.mousewheel plugin



var mousewheelHandler = function(e) {

    function shouldAdjustOldDeltas(orgEvent, absDelta) {
        // If this is an older event and the delta is divisable by 120,
        // then we are assuming that the browser is treating this as an
        // older mouse wheel event and that we should divide the deltas
        // by 40 to try and get a more usable deltaFactor.
        // Side note, this actually impacts the reported scroll distance
        // in older browsers and can cause scrolling to be slower than native.
        // Turn this off by setting $.event.special.mousewheel.settings.adjustOldDeltas to false.
        return orgEvent.type === 'mousewheel' && absDelta % 120 === 0;
    }

    function nullLowestDelta() {
        lowestDelta = null;
    }

    var toBind = ( 'onwheel' in window.document || window.document.documentMode >= 9 ) ?
                 ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'],
        nullLowestDeltaTimeout, lowestDelta;

    var mousewheelHandler = function(fn) {

        return function(e) {

            var event = normalizeEvent(e || window.event),
                args = slice.call(arguments, 1),
                delta = 0,
                deltaX = 0,
                deltaY = 0,
                absDelta = 0,
                offsetX = 0,
                offsetY = 0;


            event.type = 'mousewheel';

            // Old school scrollwheel delta
            if ('detail'      in event) { deltaY = event.detail * -1; }
            if ('wheelDelta'  in event) { deltaY = event.wheelDelta; }
            if ('wheelDeltaY' in event) { deltaY = event.wheelDeltaY; }
            if ('wheelDeltaX' in event) { deltaX = event.wheelDeltaX * -1; }

            // Firefox < 17 horizontal scrolling related to DOMMouseScroll event
            if ('axis' in event && event.axis === event.HORIZONTAL_AXIS) {
                deltaX = deltaY * -1;
                deltaY = 0;
            }

            // Set delta to be deltaY or deltaX if deltaY is 0 for backwards compatabilitiy
            delta = deltaY === 0 ? deltaX : deltaY;

            // New school wheel delta (wheel event)
            if ('deltaY' in event) {
                deltaY = event.deltaY * -1;
                delta = deltaY;
            }
            if ('deltaX' in event) {
                deltaX = event.deltaX;
                if (deltaY === 0) { delta = deltaX * -1; }
            }

            // No change actually happened, no reason to go any further
            if (deltaY === 0 && deltaX === 0) { return; }

            // Store lowest absolute delta to normalize the delta values
            absDelta = Math.max(Math.abs(deltaY), Math.abs(deltaX));

            if (!lowestDelta || absDelta < lowestDelta) {
                lowestDelta = absDelta;

                // Adjust older deltas if necessary
                if (shouldAdjustOldDeltas(event, absDelta)) {
                    lowestDelta /= 40;
                }
            }

            // Adjust older deltas if necessary
            if (shouldAdjustOldDeltas(event, absDelta)) {
                // Divide all the things by 40!
                delta /= 40;
                deltaX /= 40;
                deltaY /= 40;
            }

            // Get a whole, normalized value for the deltas
            delta = Math[delta >= 1 ? 'floor' : 'ceil'](delta / lowestDelta);
            deltaX = Math[deltaX >= 1 ? 'floor' : 'ceil'](deltaX / lowestDelta);
            deltaY = Math[deltaY >= 1 ? 'floor' : 'ceil'](deltaY / lowestDelta);

            // Normalise offsetX and offsetY properties
            if (this.getBoundingClientRect) {
                var boundingRect = this.getBoundingClientRect();
                offsetX = event.clientX - boundingRect.left;
                offsetY = event.clientY - boundingRect.top;
            }

            // Add information to the event object
            event.deltaX = deltaX;
            event.deltaY = deltaY;
            event.deltaFactor = lowestDelta;
            event.offsetX = offsetX;
            event.offsetY = offsetY;
            // Go ahead and set deltaMode to 0 since we converted to pixels
            // Although this is a little odd since we overwrite the deltaX/Y
            // properties with normalized deltas.
            event.deltaMode = 0;

            // Add event and delta to the front of the arguments
            args.unshift(event, delta, deltaX, deltaY);

            // Clearout lowestDelta after sometime to better
            // handle multiple device types that give different
            // a different lowestDelta
            // Ex: trackpad = 3 and mouse wheel = 120
            if (nullLowestDeltaTimeout) { clearTimeout(nullLowestDeltaTimeout); }
            nullLowestDeltaTimeout = setTimeout(nullLowestDelta, 200);



            return fn.apply(this, args);
        }
    };

    mousewheelHandler.events = function() {
        var doc = window.document;
        return ( 'onwheel' in doc || doc.documentMode >= 9 ) ?
               ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'];
    };

    return mousewheelHandler;

}();



var addListener = function(){

    var fn = null,
        prefix = null;

    return function addListener(el, event, func) {

        if (fn === null) {
            if (el.addEventListener) {
                fn = "addEventListener";
                prefix = "";
            }
            else {
                fn = "attachEvent";
                prefix = "on";
            }
            //fn = el.attachEvent ? "attachEvent" : "addEventListener";
            //prefix = el.attachEvent ? "on" : "";
        }


        if (event == "mousewheel") {
            func = mousewheelHandler(func);
            var events = mousewheelHandler.events(),
                i, l;
            for (i = 0, l = events.length; i < l; i++) {
                el[fn](prefix + events[i], func, false);
            }
        }
        else {
            el[fn](prefix + event, func, false);
        }

        return func;
    }

}();




defineClass({
    $class: "ajax.transport.Script",

    type: "script",
    _opt: null,
    _deferred: null,
    _ajax: null,
    _el: null,

    $init: function(opt, deferred, ajax) {
        var self        = this;

        self._opt       = opt;
        self._ajax      = ajax;
        self._deferred  = deferred;
    },

    send: function() {

        var self    = this,
            script  = document.createElement("script");

        setAttr(script, "async", "async");
        setAttr(script, "charset", "utf-8");
        setAttr(script, "src", self._opt.url);

        addListener(script, "load", bind(self.onLoad, self));
        addListener(script, "error", bind(self.onError, self));

        document.head.appendChild(script);

        self._el = script;
    },

    onLoad: function(evt) {
        if (this._deferred) { // haven't been destroyed yet
            this._deferred.resolve(evt);
        }
    },

    onError: function(evt) {
        this._deferred.reject(evt);
    },

    abort: function() {
        var self    = this;

        if (self._el.parentNode) {
            self._el.parentNode.removeChild(self._el);
        }
    },

    destroy: function() {

        var self    = this;

        if (self._el.parentNode) {
            self._el.parentNode.removeChild(self._el);
        }
    }
});





defineClass({

    $class: "ajax.transport.IFrame",

    type: "iframe",
    _opt: null,
    _deferred: null,
    _ajax: null,
    _el: null,
    _sent: false,

    $init: function(opt, deferred, ajax) {
        var self        = this;

        self._opt       = opt;
        self._ajax      = ajax;
        self._deferred  = deferred;
    },

    send: function() {

        var self    = this,
            frame   = document.createElement("iframe"),
            id      = "frame-" + nextUid(),
            form    = self._opt.form;

        setAttr(frame, "id", id);
        setAttr(frame, "name", id);
        frame.style.display = "none";
        document.body.appendChild(frame);

        setAttr(form, "action", self._opt.url);
        setAttr(form, "target", id);

        addListener(frame, "load", bind(self.onLoad, self));
        addListener(frame, "error", bind(self.onError, self));

        self._el = frame;

        var tries = 0;

        var submit = function() {

            tries++;

            try {
                form.submit();
                self._sent = true;
            }
            catch (thrownError) {
                if (tries > 2) {
                    self._deferred.reject(thrownError);
                }
                else {
                    async(submit, null, [], 1000);
                }
            }
        };

        submit();
    },

    onLoad: function() {

        var self    = this,
            frame   = self._el,
            doc,
            data;

        if (!self._sent) {
            return;
        }

        if (self._opt && !self._opt.jsonp) {

            try {
                doc = frame.contentDocument || frame.contentWindow.document;
                data = doc.body.innerHTML;
                self._ajax.processResponse(data);
            }
            catch (thrownError) {
                self._deferred.reject(thrownError);
            }
        }
    },

    onError: function(evt) {

        if (!this._sent) {
            return;
        }

        this._deferred.reject(evt);
    },

    abort: function() {
        var self    = this;

        if (self._el.parentNode) {
            self._el.parentNode.removeChild(self._el);
        }
    },

    destroy: function() {
        var self    = this;

        if (self._el.parentNode) {
            self._el.parentNode.removeChild(self._el);
        }
    }

});









(function(){

    var rquery          = /\?/,
        rurl            = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,
        rhash           = /#.*$/,
        rts             = /([?&])_=[^&]*/,
        rgethead        = /^(?:GET|HEAD)$/i,

        globalEvents    = new Observable,

        formDataSupport = !!(window && window.FormData),

        processData     = function(data, opt, ct) {

            var type        = opt ? opt.dataType : null,
                selector    = opt ? opt.selector : null,
                doc;

            if (!isString(data)) {
                return data;
            }

            ct = ct || "";

            if (type === "xml" || !type && ct.indexOf("xml") >= 0) {
                doc = parseXML(trim(data));
                return selector ? select(selector, doc) : doc;
            }
            else if (type === "html") {
                doc = parseXML(data, "text/html");
                return selector ? select(selector, doc) : doc;
            }
            else if (type == "fragment") {
                var fragment    = document.createDocumentFragment(),
                    div         = document.createElement("div");

                div.innerHTML   = data;

                while (div.firstChild) {
                    fragment.appendChild(div.firstChild);
                }

                return fragment;
            }
            else if (type === "json" || !type && ct.indexOf("json") >= 0) {
                return parseJSON(trim(data));
            }
            else if (type === "script" || !type && ct.indexOf("javascript") >= 0) {
                globalEval(data);
            }

            return data + "";
        },


        fixUrlDomain    = function(url) {

            if (url.substr(0,1) == "/") {
                return location.protocol + "//" + location.host + url;
            }
            else {
                return url;
            }
        },

        prepareUrl  = function(url, opt) {

            url.replace(rhash, "");

            if (!opt.allowCache) {

                var stamp   = (new Date).getTime();

                url = rts.test(url) ?
                    // If there is already a '_' parameter, set its value
                      url.replace(rts, "$1_=" + stamp) :
                    // Otherwise add one to the end
                      url + (rquery.test(url) ? "&" : "?" ) + "_=" + stamp;
            }

            if (opt.data && opt.method != "POST" && !opt.contentType && (!formDataSupport || !(opt.data instanceof window.FormData))) {

                opt.data = !isString(opt.data) ? serializeParam(opt.data) : opt.data;
                url += (rquery.test(url) ? "&" : "?") + opt.data;
                opt.data = null;
            }

            return url;
        },

        data2form       = function(data, form, name) {

            var i, input, len;

            if (!isObject(data) && !isFunction(data) && name) {
                input   = document.createElement("input");
                setAttr(input, "type", "hidden");
                setAttr(input, "name", name);
                setAttr(input, "value", data);
                form.appendChild(input);
            }
            else if (isArray(data) && name) {
                for (i = 0, len = data.length; i < len; i++) {
                    data2form(data[i], form, name + "["+i+"]");
                }
            }
            else if (isObject(data)) {
                for (i in data) {
                    if (data.hasOwnProperty(i)) {
                        data2form(data[i], form, name ? name + "["+i+"]" : i);
                    }
                }
            }
        },


        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest
        serializeForm   = function(form) {

            var oField, sFieldType, nFile, obj = {};

            for (var nItem = 0; nItem < form.elements.length; nItem++) {

                oField = form.elements[nItem];

                if (getAttr(oField, "name") === null) {
                    continue;
                }

                sFieldType = oField.nodeName.toUpperCase() === "INPUT" ?
                             getAttr(oField, "type").toUpperCase() : "TEXT";

                if (sFieldType === "FILE") {
                    for (nFile = 0;
                         nFile < oField.files.length;
                         obj[oField.name] = oField.files[nFile++].name){}

                } else if ((sFieldType !== "RADIO" && sFieldType !== "CHECKBOX") || oField.checked) {
                    obj[oField.name] = oField.value;
                }
            }

            return serializeParam(obj);
        },

        globalEval = function(code){
            var script, indirect = eval;
            if (code) {
                if (/^[^\S]*use strict/.test(code)) {
                    script = document.createElement("script");
                    script.text = code;
                    document.head.appendChild(script)
                        .parentNode.removeChild(script);
                } else {
                    indirect(code);
                }
            }
        };

    defineClass({

        $class: "Ajax",
        $mixins: ["mixin.Promise"],

        _jsonpName: null,
        _transport: null,
        _opt: null,
        _deferred: null,
        _promise: null,
        _timeout: null,
        _form: null,
        _removeForm: false,

        $init: function(opt) {

            if (opt.url) {
                opt.url = fixUrlDomain(opt.url);
            }

            var self        = this,
                href        = window ? window.location.href : "",
                local       = rurl.exec(href.toLowerCase()) || [],
                parts       = rurl.exec(opt.url.toLowerCase());

            self._opt       = opt;

            if (opt.crossDomain !== true && opt.ignoreCrossDomain !== true) {
                opt.crossDomain = !!(parts &&
                                     (parts[1] !== local[1] || parts[2] !== local[2] ||
                                      (parts[3] || (parts[1] === "http:" ? "80" : "443")) !==
                                      (local[3] || (local[1] === "http:" ? "80" : "443"))));
            }

            //deferred    = new Promise,
            var transport;

            if (opt.files) {
                if (!formDataSupport) {
                    opt.transport = "iframe";
                }
            }

            if (opt.transport == "iframe" && !opt.form) {
                self.createForm();
                opt.form = self._form;
            }
            else if (opt.form) {
                self._form = opt.form;
                if (opt.method == "POST" && !formDataSupport) {
                    opt.transport = "iframe";
                }
            }

            if (opt.form && opt.transport != "iframe" && opt.method == "POST") {
                if (formDataSupport) {
                    opt.data = new FormData(opt.form);
                }
                else {
                    opt.contentType = "application/x-www-form-urlencoded";
                    opt.data = serializeForm(opt.form);
                }
            }
            else if (opt.contentType == "json") {
                opt.contentType = opt.contentTypeHeader || "text/plain";
                opt.data = isString(opt.data) ? opt.data : JSON.stringify(opt.data);
            }
            else if (isPlainObject(opt.data) && opt.method == "POST" && formDataSupport) {

                var d = opt.data,
                    k;

                opt.data = new FormData;

                for (k in d) {
                    opt.data.append(k, d[k]);
                }
            }

            if (opt.files) {
                self.importFiles();
            }

            opt.url = prepareUrl(opt.url, opt);

            if ((opt.crossDomain || opt.transport == "script") && !opt.form) {
                transport   = new MetaphorJs.ajax.transport.Script(opt, self.$$promise, self);
            }
            else if (opt.transport == "iframe") {
                transport   = new MetaphorJs.ajax.transport.IFrame(opt, self.$$promise, self);
            }
            else {
                transport   = new MetaphorJs.ajax.transport.XHR(opt, self.$$promise, self);
            }

            //self._deferred      = deferred;
            self._transport     = transport;

            self.$$promise.done(function(value) {
                globalEvents.trigger("success", value);
            });
            self.$$promise.fail(function(reason) {
                globalEvents.trigger("error", reason);
            });
            self.$$promise.always(function(){
                globalEvents.trigger("end");
            });

            globalEvents.trigger("start");


            if (opt.timeout) {
                self._timeout = setTimeout(bind(self.onTimeout, self), opt.timeout);
            }

            if (opt.jsonp) {
                self.createJsonp();
            }

            if (globalEvents.trigger("before-send", opt, transport) === false) {
                //self._promise = Promise.reject();
                self.$$promise.reject();
            }
            if (opt.beforeSend && opt.beforeSend.call(opt.context, opt, transport) === false) {
                //self._promise = Promise.reject();
                self.$$promise.reject();
            }

            if (self.$$promise.isPending()) {
                async(transport.send, transport);

                //deferred.abort = bind(self.abort, self);
                self.$$promise.always(self.asyncDestroy, self);

                //self._promise = deferred;
            }
            else {
                async(self.asyncDestroy, self, [], 1000);
            }
        },

        asyncDestroy: function() {

            var self = this;

            if (self.$isDestroyed()) {
                return;
            }

            if (self.$$promise.hasListeners()) {
                async(self.asyncDestroy, self, [], 1000);
                return;
            }

            self.$destroy();
        },

        /*promise: function() {
            return this._promise;
        },*/

        abort: function(reason) {
            this.$$promise.reject(reason || "abort");
            this._transport.abort();
            //this._deferred.reject(reason || "abort");
            return this;
        },

        onTimeout: function() {
            this.abort("timeout");
        },

        getTransport: function() {
            return this._transport;
        },

        createForm: function() {

            var self    = this,
                form    = document.createElement("form");

            form.style.display = "none";
            setAttr(form, "method", self._opt.method);
            setAttr(form, "enctype", "multipart/form-data");

            data2form(self._opt.data, form, null);

            document.body.appendChild(form);

            self._form = form;
            self._removeForm = true;
        },

        importFiles: function() {

            var self    = this,
                opt     = self._opt,
                files   = opt.files,
                tr      = opt.transport,
                form    = self._form,
                data    = opt.data,
                i, l,
                j, jl,
                name,
                input,
                file,
                item;

            for (i = 0, l = files.length; i < l; i++) {

                item = files[i];

                if (isArray(item)) {
                    name = item[0];
                    file = item[1];
                }
                else {
                    if (window.File && item instanceof File) {
                        name = item.uploadName || ("upload" + (l > 1 ? "[]" : ""));
                    }
                    else {
                        name = item.name || "upload" + (l > 1 ? "[]" : "");
                    }
                    file = item;
                }

                if (!window.File || !(file instanceof File)) {
                    input = file;
                    file = null;
                }

                if (form) {
                    if (input) {
                        form.appendChild(input);
                    }
                }
                else {
                    if (file) {
                        data.append(name, file);
                    }
                    else if (input.files && input.files.length) {
                        for (j = 0, jl = input.files.length; j < jl; j++) {
                            data.append(name, input.files[j]);
                        }
                    }
                }
            }
        },

        createJsonp: function() {

            var self        = this,
                opt         = self._opt,
                paramName   = opt.jsonpParam || "callback",
                cbName      = opt.jsonpCallback || "jsonp_" + nextUid();

            opt.url += (rquery.test(opt.url) ? "&" : "?") + paramName + "=" + cbName;

            self._jsonpName = cbName;

            if (typeof window != strUndef) {
                window[cbName] = bind(self.jsonpCallback, self);
            }
            if (typeof global != strUndef) {
                global[cbName] = bind(self.jsonpCallback, self);
            }

            return cbName;
        },

        jsonpCallback: function(data) {

            var self    = this,
                res;

            try {
                res = self.processResponseData(data);
            }
            catch (thrownError) {
                if (self.$$promise) {
                    self.$$promise.reject(thrownError);
                }
                else {
                    error(thrownError);
                }
            }

            if (self.$$promise) {
                self.$$promise.resolve(res);
            }
        },

        processResponseData: function(data, contentType) {

            var self    = this,
                opt     = self._opt;

            data    = processData(data, opt, contentType);

            if (globalEvents.hasListener("process-response")) {
                globalEvents.trigger("process-response", data, self.$$promise);
            }

            if (opt.processResponse) {
                data    = opt.processResponse.call(opt.context, data, self.$$promise);
            }

            return data;
        },

        returnResponse: function(data, contentType) {

            var self    = this;

            if (!self._opt.jsonp) {
                return self.processResponseData(data, contentType);
            }

            return null;
        },

        processResponse: function(data, contentType) {

            var self        = this,
                deferred    = self.$$promise,
                result;

            if (!self._opt.jsonp) {
                try {
                    result = self.processResponseData(data, contentType)
                }
                catch (thrownError) {
                    deferred.reject(thrownError);
                }

                deferred.resolve(result);
            }
            else {
                if (!data) {
                    deferred.reject("jsonp script is empty");
                    return;
                }

                try {
                    globalEval(data);
                }
                catch (thrownError) {
                    deferred.reject(thrownError);
                }

                if (deferred.isPending()) {
                    deferred.reject("jsonp script didn't invoke callback");
                }
            }
        },

        destroy: function() {

            var self    = this;

            if (self._timeout) {
                clearTimeout(self._timeout);
            }

            if (self._form && self._form.parentNode && self._removeForm) {
                self._form.parentNode.removeChild(self._form);
            }

            self._transport.$destroy();

            if (self._jsonpName) {
                if (typeof window != strUndef) {
                    delete window[self._jsonpName];
                }
                if (typeof global != strUndef) {
                    delete global[self._jsonpName];
                }
            }
        }

    }, {

        prepareUrl: prepareUrl,
        global: globalEvents
    });


}());



var factory = cs.factory;



/**
 * @mixin Observable
 * @description Mixin adds observable features to the host object.
 *              It adds 'callback' option to the host config. See $beforeInit.
 *              Mixin is designed for MetaphorJs class system.
 * @code examples/mixin.js
 */
ns.register("mixin.Observable", {

    /**
     * @private
     * @type {Observable}
     * @description You can use this instance in your $init function
     */
    $$observable: null,

    /**
     * @private
     * @type {object}
     */
    $$callbackContext: null,

    /**
     * @protected
     * @type {object} {
     *      Override this to define event properties. 
     *      Object's key is event name, value - either returnResult or 
     *      options object. See {@link class:Observable.createEvent}
     * }
     */
    $$events: null,

    /**
     * @method
     * @private
     * @param {object} cfg {
     *      This is a config that was passed to the host object's constructor.
     *      It is being passed to mixin's $beforeInit automatically.
     *      @type {object} callback {
     *          Here, except for 'context', '$context' and 'scope', 
     *          keys are event names and values are listeners. 
     *          @type {object} context All given listeners context
     *          @type {object} scope The same
     *      }
     * }
     */
    $beforeInit: function(cfg) {
        var self = this;
        self.$$observable = new Observable;
        self.$initObservable(cfg);
    },

    /**
     * @method
     * @private
     * @ignore
     * @param {object} cfg
     */
    $initObservable: function(cfg) {

        var self    = this,
            obs     = self.$$observable,
            i;

        if (cfg && cfg.callback) {
            var ls = cfg.callback,
                context = ls.context || ls.scope || ls.$context,
                events = extend({}, self.$$events, ls.$events, true, false);

            for (i in events) {
                obs.createEvent(i, events[i]);
            }

            ls.context = null;
            ls.scope = null;

            for (i in ls) {
                if (ls[i]) {
                    obs.on(i, ls[i], context || self);
                }
            }

            cfg.callback = null;

            if (context) {
                self.$$callbackContext = context;
            }
        }
        else if (self.$$events) {
            for (i in self.$$events) {
                obs.createEvent(i, self.$$events[i]);
            }
        }
    },

    /**
     * @method
     * @see {@link class:Observable.on}
     */
    on: function() {
        var o = this.$$observable;
        return o ? o.on.apply(o, arguments) : null;
    },

    /**
     * @method
     * @see {@link class:Observable.un}
     */
    un: function() {
        var o = this.$$observable;
        return o ? o.un.apply(o, arguments) : null;
    },

    /**
     * @method
     * @see {@link class:Observable.once}
     */
    once: function() {
        var o = this.$$observable;
        return o ? o.once.apply(o, arguments) : null;
    },

    /**
     * @method
     * @see {@link class:Observable.trigger}
     */
    trigger: function() {
        var o = this.$$observable;
        return o ? o.trigger.apply(o, arguments) : null;
    },

    /**
     * @method
     * @private
     * @ignore
     */
    $beforeDestroy: function() {
        this.$$observable.trigger("before-destroy", this);
    },

    /**
     * @method
     * @private
     * @ignore
     */
    $afterDestroy: function() {
        var self = this;
        self.$$observable.trigger("destroy", self);
        self.$$observable.destroy();
        self.$$observable = null;
    }
});






var Model = function(){

    
    var instances   = {},
        cache       = {};


    /**
     * @class Model
     */
    return defineClass({

        $class:         "Model",
        $mixins:        ["mixin.Observable"],

        type:           null,
        fields:         null,
        record:         null,
        store:          null,
        plain:          false,

        lastAjaxResponse: null,


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
         * @md-tmp model-atom
         */

        /**
         * @var object {
         *      @type {string|object} load { @md-apply model-atom }
         *      @type {string|object} save { @md-apply model-atom }
         *      @type {string|object} delete { @md-apply model-atom }
         * }
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
                    return Promise.reject(res);
                }
            }

            if (cfg.resolve) {
                res = cfg.resolve.call(self, id, data);
                if (res && isThenable(res)){
                    return res;
                }
                else if (res) {
                    return Promise.resolve(res);
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
                    promise = new Promise;

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
                return Promise.reject();
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
         * @access public
         * @param {string|number} id Record id
         * @returns MetaphorJs.lib.Promise
         */
        loadRecord: function(id) {
            return this._makeRequest("record", "load", id);
        },

        /**
         * @access public
         * @param {MetaphorJs.Record} rec
         * @param {array|null} keys
         * @param {object|null} extra
         * @returns MetaphorJs.lib.Promise
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
         * @access public
         * @param {MetaphorJs.Record} rec
         * @returns MetaphorJs.lib.Promise
         */
        deleteRecord: function(rec) {
            return this._makeRequest("record", "delete", rec.getId());
        },

        /**
         * @access public
         * @param {MetaphorJs.Store} store
         * @param {object} params
         * @returns MetaphorJs.lib.Promise
         */
        loadStore: function(store, params) {
            return this._makeRequest("store", "load", null, params);
        },

        /**
         * @access public
         * @param {MetaphorJs.Store} store
         * @param {object} recordData
         * @returns MetaphorJs.lib.Promise
         */
        saveStore: function(store, recordData) {
            return this._makeRequest("store", "save", null, recordData);
        },

        /**
         * @access public
         * @param {MetaphorJs.Store} store
         * @param {array} ids
         * @returns MetaphorJs.lib.Promise
         */
        deleteRecords: function(store, ids) {
            return this._makeRequest("store", "delete", ids);
        },



        /**
         * @returns object
         */
        extendPlainRecord: function(rec) {
            var self    = this,
                ext     = self.getRecordProp(null, "extend");

            return ext ? extend(rec, ext, false, false) : rec;
        },

        /**
         * @returns object
         */
        getFields: function() {
            return this.fields;
        },

        /**
         * @param {object} rec
         * @returns {*|null}
         */
        getRecordId: function(rec) {
            var idProp = this.getRecordProp("load", "id");
            return rec[idProp] || null;
        },

        /**
         * Convert field's value from database state to app state
         * @param {MetaphorJs.Record} rec
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
         * @param {MetaphorJs.Record} rec
         * @param {string} name
         * @param {string|int|bool} value
         * @returns string|int|bool|Date
         */
        onRestoreField: function(rec, name, value) {
            return value;
        },

        /**
         * Convert field's value from app state to database state
         * @param {MetaphorJs.Record} rec
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
         * @param {MetaphorJs.Record} rec
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

            if (model === "MetaphorJs.Model") {
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
         * @param {MetaphorJs.Record} rec
         */
        addToCache: function(rec) {

            var cls     = rec.$getClass(),
                id      = rec.getId();

            if (cls != "MetaphorJs.Record") {
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






/**
 * @namespace MetaphorJs
 * @class Record
 */
var Record = defineClass({

    $class: "Record",
    $mixins: ["mixin.Observable"],

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
    loading:        false,

    /**
     * @var bool
     * @access protected
     */
    dirty:          false,

    /**
     * @var MetaphorJs.Model
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
     * @var bool
     * @access protected
     */
    importUponSave: false,

    /**
     * @var bool
     * @access protected
     */
    importUponCreate: false,

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
            self.model  = Model.create(self.model);
        }
        else if (!(self.model instanceof Model)) {
            self.model  = new Model(self.model);
        }

        self.id     = id;

        if (data) {
            self.importData(data);
        }
        else if(cfg.autoLoad !== false && id) {
            self.load();
        }

        if (self.$getClass() != "MetaphorJs.Record") {
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
    isLoading: function() {
        return this.loading;
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
     * @returns {MetaphorJs.Model}
     */
    getModel: function() {
        return this.model;
    },

    /**
     * @param {MetaphorJs.Store} store
     */
    attachStore: function(store) {
        var self    = this,
            sid     = store.getId();

        if (self.stores.indexOf(sid) == -1) {
            self.stores.push(sid);
        }
    },

    /**
     * @param {MetaphorJs.Store} store
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
        Model.removeFromCache(self.$getClass(), self.id);
        self.$super();
    }

});





function isPrimitive(value) {
    var vt = varType(value);
    return vt < 3 && vt > -1;
};




var filterArray = function(){


    var compareValues = function(value, to, opt) {

            if (isFunction(to)) {
                return to(value, opt);
            }
            else if (to === "" || to === undf) {
                return true;
            }
            else if (value === undf) {
                return false;
            }
            else if (isBool(value)) {
                return value === to;
            }
            else if (to instanceof RegExp) {
                return to.test("" + value);
            }
            else if (opt == "strict") {
                return ""+value === ""+to;
            }
            else if (opt === true || opt === null || opt === undf) {
                return (""+value).toLowerCase().indexOf((""+to).toLowerCase()) != -1;
            }
            else if (opt === false) {
                return (""+value).toLowerCase().indexOf((""+to).toLowerCase()) == -1;
            }
            return false;
        },

        compare = function(value, by, opt) {

            if (isFunction(by)) {
                return by(value, opt);
            }

            if (isPrimitive(value)) {
                if (by.$ === undf) {
                    return true;
                }
                else {
                    return compareValues(value, by.$, opt);
                }
            }

            var k, i;
            for (k in by) {
                if (k == '$') {
                    for (i in value) {
                        if (compareValues(value[i], by.$, opt)) {
                            return true;
                        }
                    }
                }
                else {
                    if (compareValues(value[k], by[k], opt)) {
                        return true;
                    }
                }
            }

            return false;
        };

    var filterArray = function filterArray(a, by, opt) {

        if (!isPlainObject(by) && !isFunction(by)) {
            by = {$: by};
        }

        var ret = [],
            i, l;

        for (i = -1, l = a.length; ++i < l;) {
            if (compare(a[i], by, opt)) {
                ret.push(a[i]);
            }
        }

        return ret;
    };

    filterArray.compare = compare;

    return filterArray;

}();



function sortArray(arr, by, dir) {

    if (!dir) {
        dir = "asc";
    }

    var ret = arr.slice();

    ret.sort(function(a, b) {
        var typeA = typeof a,
            typeB = typeof b,
            valueA  = a,
            valueB  = b;

        if (typeA != typeB) {
            return 0;
        }

        if (typeA == "object") {
            if (isFunction(by)) {
                valueA = by(a);
                valueB = by(b);
            }
            else {
                valueA = a[by];
                valueB = b[by];
            }
        }

        if (typeof valueA == "number") {
            return valueA - valueB;
        }
        else {
            valueA = ("" + valueA).toLowerCase();
            valueB = ("" + valueB).toLowerCase();

            if (valueA === valueB) return 0;
            return valueA > valueB ? 1 : -1;
        }
    });

    return dir == "desc" ? ret.reverse() : ret;

};


(function(){

    var aIndexOf    = Array.prototype.indexOf;

    if (!aIndexOf) {
        aIndexOf = Array.prototype.indexOf = function (searchElement, fromIndex) {

            var k;

            // 1. Let O be the result of calling ToObject passing
            //    the this value as the argument.
            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }

            var O = Object(this);

            // 2. Let lenValue be the result of calling the Get
            //    internal method of O with the argument "length".
            // 3. Let len be ToUint32(lenValue).
            var len = O.length >>> 0;

            // 4. If len is 0, return -1.
            if (len === 0) {
                return -1;
            }

            // 5. If argument fromIndex was passed let n be
            //    ToInteger(fromIndex); else let n be 0.
            var n = +fromIndex || 0;

            if (Math.abs(n) === Infinity) {
                n = 0;
            }

            // 6. If n >= len, return -1.
            if (n >= len) {
                return -1;
            }

            // 7. If n >= 0, then Let k be n.
            // 8. Else, n<0, Let k be len - abs(n).
            //    If k is less than 0, then let k be 0.
            k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

            // 9. Repeat, while k < len
            while (k < len) {
                var kValue;
                // a. Let Pk be ToString(k).
                //   This is implicit for LHS operands of the in operator
                // b. Let kPresent be the result of calling the
                //    HasProperty internal method of O with argument Pk.
                //   This step can be combined with c
                // c. If kPresent is true, then
                //    i.  Let elementK be the result of calling the Get
                //        internal method of O with the argument ToString(k).
                //   ii.  Let same be the result of applying the
                //        Strict Equality Comparison Algorithm to
                //        searchElement and elementK.
                //  iii.  If same is true, return k.
                if (k in O && O[k] === searchElement) {
                    return k;
                }
                k++;
            }
            return -1;
        };
    }

    return aIndexOf;
}());






var Store = function(){

    var allStores   = {};



    /**
     * @namespace MetaphorJs
     * @class MetaphorJs.Store
     */
    return defineClass({

            $class:         "Store",
            $mixins:        ["mixin.Observable"],

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
             * @param {MetaphorJs.Record} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.lib.Promise
             */
            "delete": function(rec, silent, skipUpdate) {
                var self    = this;
                return self.deleteById(self.getRecordId(rec), silent, skipUpdate);
            },

            /**
             * @param {MetaphorJs.Record[]} recs
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
             * @param {MetaphorJs.Record|Object} rec
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
             * @param {MetaphorJs.Record|Object} item
             * @returns MetaphorJs.Record|Object
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
                rec[mode]("dirty-change", self.onRecordDirtyChange, self);
                return rec;
            },

            /**
             * @access protected
             * @param {MetaphorJs.Record|Object} rec
             */
            onRecordDirtyChange: function(rec) {
                this.trigger("update", this, rec);
            },

            /**
             * @access protected
             * @param {MetaphorJs.Record|Object} rec
             * @param {string} k
             * @param {string|int|bool} v
             * @param {string|int|bool} prev
             */
            onRecordChange: function(rec, k, v, prev) {
                this.trigger("update", this, rec);
            },

            /**
             * @access protected
             * @param {MetaphorJs.Record|Object} rec
             */
            onRecordDestroy: function(rec) {
                this.remove(rec);
            },





            /**
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @param {boolean} unfiltered
             * @returns {MetaphorJs.Record|Object|null}
             */
            shift: function(silent, skipUpdate, unfiltered) {
                return this.removeAt(0, 1, silent, skipUpdate, unfiltered);
            },

            /**
             * Works with unfiltered data
             * @param {{}|MetaphorJs.Record} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns {MetaphorJs.Record|Object}
             */
            unshift: function(rec, silent, skipUpdate) {
                return this.insert(0, rec, silent, skipUpdate);
            },

            /**
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @param {boolean} unfiltered
             * @returns {MetaphorJs.Record|Object|null}
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
             * @param {MetaphorJs.Record|Object} rec
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
             * @returns MetaphorJs.Record|Object|null
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
             * @param {MetaphorJs.Record|Object} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.Record|Object
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
             * @param {MetaphorJs.Record|Object} old
             * @param {MetaphorJs.Record|Object} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.Record|Object
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
             * @param {MetaphorJs.Record|Object} rec
             * @param {boolean} silent
             * @param {boolean} skipUpdate
             * @returns MetaphorJs.Record|Object|null
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
             * @returns MetaphorJs.Record|Object|null
             */
            removeId: function(id, silent, skipUpdate) {
                var inx = this.indexOfId(id, true);
                if (inx !== -1) {
                    return this.removeAt(inx, 1, silent, skipUpdate, true);
                }
            },



            /**
             * @param {MetaphorJs.Record|Object} rec
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
             * @returns MetaphorJs.Record|Object|null
             */
            getAt: function(index, unfiltered) {
                return unfiltered ?
                       (this.items[index] || undf) :
                       (this.current[index] || undf);
            },

            /**
             * @param {string|int} id
             * @param {boolean} unfiltered
             * @returns MetaphorJs.Record|Object|null
             */
            getById: function(id, unfiltered) {
                return unfiltered ?
                       (this.map[id] || undf) :
                       (this.currentMap[id] || undf);
            },

            /**
             * Works with filtered list unless fromOriginal = true
             * @param {MetaphorJs.Record|Object} rec
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
             *      @param {MetaphorJs.Record|Object} rec
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
             * @returns MetaphorJs.Record|Object
             */
            first : function(unfiltered){
                return unfiltered ? this.items[0] : this.current[0];
            },

            /**
             * @param {boolean} unfiltered
             * @returns MetaphorJs.Record|Object
             */
            last : function(unfiltered){
                return unfiltered ? this.items[this.length-1] : this.current[this.current-1];
            },

            /**
             *
             * @param {number} start Optional
             * @param {number} end Optional
             * @param {boolean} unfiltered
             * @returns MetaphorJs.Record[]|Object[]
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
             *      @param {MetaphorJs.Record|Object} rec
             *      @param {string|int} id
             * }
             * @param {object} context
             * @param {number} start { @default 0 }
             * @param {boolean} unfiltered
             * @returns MetaphorJs.Record|Object|null
             */
            findBy: function(fn, context, start, unfiltered) {
                var inx = this.findIndexBy(fn, context, start, unfiltered);
                return inx === -1 ? undf : this.getAt(inx, unfiltered);
            },

            /**
             *
             * @param {function} fn {
             *      @param {MetaphorJs.Record|Object} rec
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
             * @returns MetaphorJs.Record|Object|null
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


            destroy: function() {

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
return MetaphorJs;

};/* BUNDLE END 347 */