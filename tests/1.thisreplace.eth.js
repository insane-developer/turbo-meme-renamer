/* global views */
views('wtf', function(data){
    return data.bebebe + data.lalala;
});

views('wtf', function(data){
    var somevar = 42;

    var google = data? data : 42;
    return data.bebebe + data.lalala;
});

views('thisreplace', function(data){
    var somevar = data;

    somevar = {bla: 'bla'};

    return somevar.bla + somevar.foo;
});