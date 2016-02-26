/* global views */
(function(views){
    'use strict';
    views('whatsthis', 'dsfgsdfgdf');views('wtf', function(){
        return this.wtf + 'string' + 'string';/* comment */
    });views('whatdfgsdgsthis', 'dsfgsdfgdfsdgdgsdfg');

    // one-line comment
    views('smth', function(/* in-the-middle-of-code comment */) {
               /* multiline,
                * indented comment
                */
        return 'bla';
    });
    crazy:
    try{
        bla > bal | ee;
        if(!erp) {
            here: while(!qwerty) {
                /* do nothing */
              
                continue here;
            }
            do {
                /* break */
            } while(true);
        } else {
            lalala;
        }
        switch(waf) {
            case 'lala':
                break;
                default:
                    return -1;
        }
        for(var i =0 ; i < qqq; i++) {
            here: beAmused();
            continue;
        }
        
        for(   ;  ;   )
            nothingToDo();
        var e = [2,234,234,234].map(function(item) {
            return -item;
        });
    }catch(e){
        throw new Error(e);
    } finally{
        beGood();
    }
})(views);


