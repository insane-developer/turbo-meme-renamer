/* global views */
views('sdgsdfg', function(data){
    var self = this;
    function declaration(smth){
        return this + 'a' + smth;
    }
    var expression = function(el){
        return el + el + this;
    };
    return declaration.call(data, self.firstarg) + expression.apply(data, data.firstarg + data.firstarg);
});

views('sdgsdfg', function(data, req, execView){
    var smth = 45,
        elses=42;
    return views('dfgdgsdf', data) + views('dfgdgsdf', {e:4}) + declaration + execView('ololo', data);
});