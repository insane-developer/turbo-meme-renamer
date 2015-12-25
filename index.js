var fs = require('fs'),
    path = require('path'),
    acorn = require('acorn'),
    uglify = require('uglify-js'),
    walker = require('acorn/util/walk'),
    options = {};

module.exports = {
    process: function(files){
        if(!files && files.length){
            console.log('No files');
            return;
        }
        files.forEach(readFile);
    },
    configure: function(_options){
        options = _options;
    }
};

function readFile(file){
    var resolved = path.resolve(file);
    fs.readFile(resolved, 'utf-8', function prepareForTheTrick(err, data){
        if(err){
            throw err;
        }
        var comments = [], tokens = [],
            ast = uglify.parse(data),
            matches = doTheTrick(resolved, ast);

        var compiled = compile(data, matches, transform),
            letFunc = 'views.let',
            getFunc = 'views.get';
        if(options.getlet){
            compiled = compiled.replace(/views(\s*\((['"])[^'"]+\2\s*,\s*(function|[^\s]))/g, function(match, all, quote, arg){
                var str = '';
                if(/function|['"]/.test(arg)){
                    str += colorize(letFunc);
                }else{
                    str += colorize(getFunc);
                }
                return str + all;
            });
        }
        if(!options.write){
            if (data !== compiled) {
                console.log(compiled);
            } else {
                console.log('No changes', resolved);
            }
        }else{
            fs.writeFile(resolved, compiled, 'utf-8', function(err){
                if(err){
                    throw err;
                }
                console.log('Записан:', file);
            });
        }
    });
}
function colorize(str){
    if(options.color && !options.write){
        return '\033[32m' + str + '\033[0m';
    }else{
        return str;
    }
}
function transform(str){
    var substitute = options.argname || 'dataArgument';

    /* найдем все синонимы this*/

    var thisSynonyms = ['this'];
    str.replace(/(var\s*|,\s*\n?\s*)([^\s=]+)\s*=\s*this\s*([;,])(\s*\n\s*)/g, function(match, varvar, syn, lineEnd, newline){
        thisSynonyms.push(syn);
    });
    
    /* заменим все this и синонимы на substitute */
  //  var re = new RegExp('\\b(?:' + thisSynonyms.join('|') + ')\\b', 'g'),
  //      str2 = str.replace(re, colorize(substitute));
    var re = new RegExp('(\\b(?:' + thisSynonyms.join('|') + ')\\b\.|\\W)views(\\()', 'g'),
    /*/(this.|\W)views(\((['"])[^'"]+\3\s*,)/g*/
        str2 = str.replace(re, function(match, prepend, group) {
        if (thisSynonyms.indexOf(prepend.substr(0, prepend.length - 1)) !== -1) {
            return match;
        }
        return prepend + colorize(substitute) + group;
    });

    /* если что-то заменилось в предыдущем пункте, добавим аргумент substitute */
    if(str !== str2){
        str = str2.replace(/(views\((['"])[^'"]+\2\s*,\s*function\s*)\(\)/, function(match, group){
            return group + '(' + colorize(substitute) + ')';
        });
    }
    
    return str;
}
function compile(str, matches, transformMatch){
    var tokens = [],
        start = 0;
    matches.forEach(function(match){
        var matchStart = match.start.pos;
        tokens.push(str.slice(start, matchStart));
        start = match.end.pos + 1;
        tokens.push(transformMatch(str.slice(matchStart, match.end.pos + 1)));
    });
    tokens.push(str.slice(start));
    return tokens.join('');
}

function doTheTrick(resolved, ast){
  /*  walker.ancestor(ast, {
        CallExpression: function(node, stack){
            console.log('----------------\n', node, '\nstack:\n', JSON.stringify(stack, 'body', '  '));
        }
    });
    */
    var pattern = {
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
    return recursiveFind(pattern, ast);
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
                    
                    return false
                }
            }else{
                
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
                        
                        return false;
                    }
                }else{
                    
                    return false;
                }
            }
            return true;
        }
    }
}