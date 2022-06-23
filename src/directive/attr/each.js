
require("metaphorjs/src/app/StoreRenderer.js");
require("metaphorjs/src/directive/attr/each.js");
require("../../model/Store.js");

const Directive = require("metaphorjs/src/app/Directive.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js");

Directive.getDirective("attr", "each")
    .registerType(MetaphorJs.model.Store, MetaphorJs.app.StoreRenderer);

