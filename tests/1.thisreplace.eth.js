var ololoe = 42;
views('wtf', function(data){
    var self;
    return data.bebebe + data.lalala;
});

views('wtf', function(params){
    var somevar = 42,
        self,
        any;

    var evil,
        angry;

    var balls,
        steel = balls = params;

    function somefunc(data, req){
        return data.views('dfgd') + data.Traffic;
    }

    var google =params || 42;
    return params.bebebe + params.lalala;
});

views('thisreplace', function(){
    var somevar;

    somevar = {bla: 'bla'};

    function good(bla) {
        return ble + 42;
    }
    return somevar.bla + somevar.foo;
});

views('innerfunc', function(data) {
    var self;
    
    function awesome(params, that) {
        return data.value + params.value + that.thing + this.globalvar;
    }
    
    return awesome({value: 42}, data);
});