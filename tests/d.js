views('lala', 'omg');

views('oo', function(){
    return this.views('lala', {
        ee:3
    });
});