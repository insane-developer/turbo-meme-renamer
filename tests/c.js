function three(firstarg){
    var self = this;
    function declaration(smth){
        return this + 'a' + smth;
    }
    var expression = function(el){
        return el + el + this;
    };
    return declaration.call(self, firstarg) + expression.apply(this, firstarg + firstarg);
}