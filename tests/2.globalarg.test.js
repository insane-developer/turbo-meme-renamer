views('simple', function() {
    var traffic = this.Traffic,
        self = this,
        bla = 41;
    
    bla++;
    
    var xf = self.MordaZone;
    
    traffic.url.prelace(/%d/, xf);
    
    return this.views('bla', traffic);
});

views('scoped', function() {
    var self = this;
    function someTrickyThing(data) {
        return self.Traffic.items.map(function(item) {
            return item.url + this.MordaZone;
        }, self);
    }

    return someTrickyThing(this);
});