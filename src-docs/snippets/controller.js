// Using controllers

var model = new MetaphorJs.model.Model({
    controller: {
        someaction: {
            url: "/action/url",
            success: function(response) {
                // let's say, response must contain success field
                return !!response.success;
            },
            processRequest: function(promise) {
                promise.then(function(response){
                    MyCoolApp.log("Performed some action", response);
                });
            },
            validate: function(id, data) {
                // let's say, some data parameter cannot go to server
                if (data && data.nogo) {
                    return false;
                }
            }
        }
    }
});

model.runContoller("someaction", null, {
    somedata: true
}).then(function(response){
    console.log(response);
});
