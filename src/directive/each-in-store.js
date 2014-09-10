

var registerAttributeHandler = require("../../../metaphorjs/src/func/directive/registerAttributeHandler.js"),
    StoreRenderer = require("../view/StoreRenderer.js");


registerAttributeHandler("mjs-each-in-store", 100, StoreRenderer);
