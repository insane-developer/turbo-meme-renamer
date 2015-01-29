var fs = require('fs'),
    path = require('path'),
    uglify = require('uglify-js');

module.exports = function(files){
    if(!files && files.length){
        console.log('No files');
        return;
    }
    files.forEach(readFile);
};

function readFile(file){
    var resolved = path.resolve(file);
    fs.readFile(resolved, 'utf-8', function prepareForTheTrick(err, data){
        if(err){
            throw err;
        }
        doTheTrick(resolved, data);
    });
}

function doTheTrick(resolved, data){
    var ast = uglify.parse(data),
        pattern = {
            start: {
                value: 'views',
                type: 'name'
            },
            body: {
                args: [
                    {
                        start: {
                            type: 'string'
                        }
                    },
                    {
                        start: {
                            value: 'function',
                            type: 'keyword'
                        },
                        argnames: []
                    }
                ],
                expression: {
                    start: {
                        type: 'name',
                        value: 'views'
                    },
                    name: 'views'
                }
            }
        };
    
    var matches = recursiveFind(pattern, ast);
    
    console.log('fine', matches.map(function(match){
        return match.print_to_string({beautify: false});
    }));

    //console.log(JSON.stringify(ast, null, '  '));
}
function recursiveFind(what, where){
    var matches = [];
    function doFind(where){
        if(deepCompare(what, where)){
            matches.push(where);
        }
        if(typeof where === 'object'){
            if(where === null){
                return;
            }
            if('forEach' in where){
                where.forEach(doFind);
            }else{
                for(var key in where){
                    doFind(where[key]);
                }
            }
        }
    }
    doFind(where);
    return matches;
}
function deepCompare(what, where){
    if(typeof what !== 'object'){
        if(typeof where !== 'object'){
            return what === where;
        }else{
            console.log('object-non-object:\n', what,'\n---\n', where);
            return false;
        }
    }else{
        if('length' in what){
            /* array like */
            if('length' in where){
                if(what.length === where.length){
                    return what.every(function compare(whatItem, i){
                        return deepCompare(whatItem, where[i]);
                    });
                }else{
                    console.log('array-length-not-equal:\n', what,'\n---\n', where);
                    return false
                }
            }else{
                console.log('object-array:\n', what,'\n---\n', where);
                return false;
            }
        }else{
            if(typeof where !== 'object'){
                return false;
            }
            if(where === null || what === null){
                return where === what;
            }
            /* object like */
            for(var key in what){
                if(key in where){
                    if(!deepCompare(what[key], where[key])){
                        console.log('subkeys-not-equal:\n', what,'\n---\n', where);
                        return false;
                    }
                }else{
                    console.log('no-key-in-object:', key, '\n', what,'\n---\n', where);
                    return false;
                }
            }
            return true;
        }
    }
}