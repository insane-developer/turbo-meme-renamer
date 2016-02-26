/* global views */
(function(views) {
    'use strict';
    views('whatsthis', 'dsfgsdfgdf');views('wtf', function(data){
        return data.wtf + 'string' + 'string';/* comment */
    });views('whatdfgsdgsthis', 'dsfgsdfgdfsdgdgsdfg');

    // one-line comment
    views('smth', function(/* in-the-middle-of-code comment */) {
               /* multiline,
                * indented comment
                */
        return 'bla';
    });
})(views);

