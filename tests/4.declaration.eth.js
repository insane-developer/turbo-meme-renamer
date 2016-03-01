views('sdgsdfg', function(data) {
    var self;
    function declaration(smth) {
        return this + 'a' + smth;
    }
    var expression = function(el) {
        return el + el + this;
    };
    return declaration.call(data, data.firstarg) + expression.apply(data, data.firstarg + data.firstarg);
});

views('sdgsdfg', function(data, req, execView) {
    var self,
        smth = 45,
        inline,
        elses= 42, declaration;
    return views('dfgdgsdf', data) + views('dfgdgsdf', {e:4}) + data + execView('ololo', data);
});