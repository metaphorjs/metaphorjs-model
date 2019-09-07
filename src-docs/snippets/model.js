// data.json
{
    records: [
        {
            id: 1,
            name: "Jane"
        },
        {
            id: 2,
            name: "John"
        }
    ]
}

// nameless model
var model = new MetaphorJs.model.Model({
    store: {
        load: "/some/data.json",
        root: "records",
        id: "id"
    }
});

var store = new MetaphorJs.model.Store({
    model: model
});

store.on("load", function(){
    var rec = store.first();
    console.log(rec); // {id: 1, name: "Jane"}
    console.log(rec.getId()) // 1
    console.log(rec.get("name")) // "Jane"
});

// nameless anonymous model
var store = new MetaphorJs.model.Store({
    model: {
        store: {
            load: "/some/data.json",
            root: "records",
            id: "id"
        }
    }
});
