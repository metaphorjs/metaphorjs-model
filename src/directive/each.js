

var Directive = require("metaphorjs/src/class/Directive.js"),
    Store = require("../class/Store.js"),
    StoreRenderer = require("../class/StoreRenderer.js");

require("metaphorjs/src/directive/attr/each.js");

Directive.getDirective("attr", "each")
    .registerType(Store, StoreRenderer);

