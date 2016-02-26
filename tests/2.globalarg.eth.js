views('simple', function(data, req, execView) {
    var traffic = req.Traffic,
        self,
        bla = 41;
    
    bla++;
    
    var xf = req.MordaZone;
    
    traffic.url.prelace(/%d/, xf);
    
    return execView('bla', traffic);
});

views('scoped', function (data, req) {
    var self;
    function someTrickyThing(data) {
        return req.Traffic.items.map(function (item) {
            return item.url + this.MordaZone;
        }, data);
    }
    return someTrickyThing(data);
});