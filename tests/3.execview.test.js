views('oo', function(){
    return this.views('lala', {
        ee:3
    });
});

views('sdfas', function(execView) {
    var x = execView(name, {dfg:4});

    return 'ok';
});

views('omg', function(execView) {
    var blabla = execView;

    return blabla(name, {dfg:4});
});