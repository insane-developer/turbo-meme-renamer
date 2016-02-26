views('oo', function(data, req, execView) {
    return execView('lala', {
        ee:3
    });
});

views('sdfas', function(data, req, execView) {
    var x = execView(name, {dfg:4});

    return 'ok';
});

views('omg', function(data, req, execView) {
    var blabla = execView,
        self,
        evil,
        tricky;

    return blabla(name, {dfg:4}) + execView('q', {}) + execView('a', {});
});