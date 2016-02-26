/* global views */
var ololoe = 42;
views('wtf', function(){
    var self = this;
    return this.bebebe + self.lalala;
});

views('wtf', function(){
    var somevar = 42,
        self = this,
        any = this;

    var evil = any,
        angry = evil;

    var balls,
        steel = balls = this;

    var google = evil? this : 42;
    return evil.bebebe + angry.lalala;
});

views('thisreplace', function(){
    var somevar = this;

    somevar = {bla: 'bla'};

    function good(bla) {
        return ble + 42;
    }
    return somevar.bla + somevar.foo;
});

views('innerfunc', function() {
    var self = this;
    
    function awesome(params, that) {
        return self.value + params.value + that.thing + this.globalvar;
    }
    
    return awesome({ value: 42 }, this);
});