/* global views */
views('wtf', function(data){
    return data.bebebe + data.lalala;
});

views('wtf', function(data){
    var somevar = 42;

    return data.bebebe + data.lalala;
});