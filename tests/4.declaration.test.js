views('sdgsdfg', function() {
    var self = this;
    function declaration(smth) {
        return this + 'a' + smth;
    }
    var expression = function(el) {
        return el + el + this;
    };
    return declaration.call(self, self.firstarg) + expression.apply(this, this.firstarg + this.firstarg);
});

views('sdgsdfg', function() {
    var self = this,
        smth = 45,
        inline=this,
        elses=42, declaration = this;
    return views('dfgdgsdf', inline) + views('dfgdgsdf', {e:4}) + declaration + self.views('ololo', this);
});