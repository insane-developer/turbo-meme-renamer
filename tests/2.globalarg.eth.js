views('simple', function(data, req, execView) {
    var traffic = req.Traffic,
        self,
        bla = 41;
    
    bla++;
    
    var xf = req.MordaZone;
    
    traffic.url.prelace(/%d/, xf);
    
    return execView('bla', traffic);
});

views('scoped', function(params, request) {
    var self;
    function someTrickyThing(data, req) {
        return request.Traffic.items.map(function(item) {
            return item.url + this.MordaZone;
        }, params);
    }

    return someTrickyThing(params);
});

views('replaced', function(somevar, gloglo) {
    return somevar.a + somevar.MordaZone + gloglo.Traffic.rate;
});
