var fs = require('fs'),
    path = require('path'),
    parser = require('acorn'),
    transformer = require('./lib/transformer.js'),
    codegen = require('./lib/writer.js'),
    vow = require('vow'),
    vowFs = require('vow-fs'),
    options = {};

module.exports = {
    process: function(files){
        if (!files && files.length){
            return vow.reject('No files');
        }
        return vow.all(files.map(readFile));
    },
    configure: function(_options){
        options = _options;
    }
};

function readFile(file){
    var resolved = path.resolve(file);
    return vowFs.read(resolved, 'utf-8').then(function prepareForTheTrick(data){
        try{
            var comments = [], tokens = [],
                ast = parser.parse(data,{
                    ranges: true,
                    onComment: comments,
                    onToken: tokens
                });

        }catch(e){
            e.message = 'WTF in ' + resolved + ':\n' + e.message;
            throw e;
        }
        ast = transformer(ast, data, require('./args.js'));
        console.log(tokens);
        try{
            codegen.attachComments(ast, comments, tokens);
            console.log(ast);
            compiled = codegen.generate(ast, {
                format: {
                    quotes: 'auto'
                },
                comment: true
            }, data);
        } catch(e) {
            console.log('too bad.', e.stack);
           // compiled = JSON.stringify(ast, null, '  ');
        }

        if (!options.write) {
            if (data !== compiled) {
                console.log('Changes in', resolved);
                console.log(compiled);
            } else {
                console.error('No changes', resolved);
            }
        } else {
            return vowFs.write(resolved, compiled, 'utf-8').then(function() {
                console.log('Записан:', file);
            });
        }
    });
}

function walkTheAst(file, ast) {
    var matches = [];
    walker.simple(ast, {
        CallExpression: function(node) {
            var callee = node.callee,
                arg0 = node.arguments[0],
                arg1 = node.arguments[1];

            if(callee && callee.type === 'Identifier' && callee.name === 'views' &&
                arg0.type === 'Literal' && typeof arg0.value === 'string' &&
                arg1.type === 'FunctionExpression') {
                matches.push(node);
            }
        }
    });
    return matches;
}

function transform2(ast) {
    console.log('transform!@');
    /* синонимы this */
    var thisSynonyms = [];
    walker.simple(ast, {
        VariableDeclaration: function(node) {
            node.declarations = node.declarations.filter(function(decl) {
                var init = decl.init;
                if(!init) {
                    return true;
                }
                switch (init.type) {
                    case 'AssignmentExpression':
                        init = findThisInAssignment(init);
                        break;
                }

                if (testItIsThisSynonym(init)) {
                    thisSynonyms.push(decl.id.name);
                    return false;
                }
                return true;
            }) || [{}];
            return node;
        }
    });
    function testItIsThisSynonym(node) {
        if (node && (node.type === 'ThisExpression' ||
            node.type === 'Identifier' && thisSynonyms.indexOf(node.name) !== -1)) {
            return true;
        }
    }
    function findThisInAssignment(node) {
        var right = node.right;
        if (right.type === 'AssignmentExpression') {
            right = findThisInAssignment(right);
        }
        if (testItIsThisSynonym(right)) {
            thisSynonyms.push(node.left.name);
        }
        return right;
    }
    console.log(thisSynonyms);
    return ast;
}

function prefectRewrite(ast, initial) {
    var str = '';
    walker.simple(ast, {
        onToken: function(node) {
            if (node.modified) {
                console.log('gen');
                str += escodegen.generate(node);
            } else {
                console.log('substr');
                str += initial.substr(node.start, node.end - node.start);
            }
        }
    });
    return str;
}

function colorize(str){
    if (options.color && !options.write){
        return '\033[32m' + str + '\033[0m';
    }else {
        return str;
    }
}
function transform(str){
    var usedArgs = 0,
        str2 = str;

    /* найдем все синонимы execView */
    if (/\bexecView\b/.test(str)) {
        usedArgs |= 0x100;
    }
    /* найдем все синонимы this*/
    var syns = ['this'],
    re = new RegExp('(var\\s*|,\\s*\\n?\\s*)([^\\s=]+)\\s*=\\s*' + 'this' + '\\s*([;,])(\\s*\\n\\s*)', 'g');
    str2 = str2.replace(re, function(match, varvar, syn, lineEnd, newline){
        syns.push(syn);
        if (varvar.indexOf('var') === 0) {
            if (lineEnd === ';') {
                return '';
            } else {
                return varvar;
            }
        } else {
            if (lineEnd === ';') {
                return '___oops;';
            } else {
                return '';
            }
        }
    });

    /* найдём для 1 аргумента такое имя, которое ещё не использовали */
    var dataArgName = findUniqueName(['data', 'params', 'dataArg', 'paramsArg', 'ctx', 'context'], str);

    /* найдём для 2 аргумента такое имя, которое ещё не использовали */
    var reqArgName = findUniqueName(['req', 'request', 'reqContext', 'reqArg', 'globalContext'], str);

    /* заменим все this.views и синонимы на execView */
    var re = new RegExp('(\\b(?:' + syns.join('|') + ')\\b\.)views\s*?\\(', 'g');

    str2 = str.replace(re, function(match, prepend, group) {
        usedArgs |= 0x100;
        return 'execView(';
    });

    /* заменим все this и синонимы на substitute */
    var re = new RegExp('\\b(?:' + syns.join('|') + ')\\b', 'g');

    console.log(syns);
    str2 = str2.replace(re, function(match, key) {
        usedArgs |= 0x001;
        return colorize(dataArgName)
    });

    /* добавим аргументы */
    var argStr = [];
    if (usedArgs > 0) {
        argStr.push(dataArgName);
    }
    if(usedArgs > 1) {
        argStr.push(reqArgName);
    }
    if(usedArgs > 2) {
        argStr.push('execView');
    }
    if (str !== str2 || argStr.length){
        str = str2.replace(/(views\((['"])[^'"]+\2\s*,\s*function\s*)\((?:[^\)]*)\)/, function(match, group){
            return group + '(' + colorize(argStr.join(', ')) + ')';
        });
    }
    
    return str;
}

function findDeclaration(what, where) {
    re = new RegExp('(var\\s*|,\\s*\\n?\\s*)' + what + '\\s*=', 'g');
    return re.test(where);
}

function findSynonyms(what, where) {
    var syns = [what],
    re = new RegExp('(var\\s*|,\\s*\\n?\\s*)([^\\s=]+)\\s*=\\s*' + what + '\\s*([;,])(\\s*\\n\\s*)', 'g');
    where.replace(re, function(match, varvar, syn, lineEnd, newline){
        syns.push(syn);
    });
    return syns;
}

function findUniqueName(candidates, where) {
    var candidate;
    candidates.some(function(name) {
        if (!findDeclaration(name, where)) {
            candidate = name;
            return true;
        }
    });
    if(candidate) {
        return candidate;
    } else {
        throw new Error('не нашел свободного имени среди ' + candidates);
    }
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
                    }
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
        if (deepCompare(what, where)){
            matches.push(where);
        }
        if (typeof where === 'object'){
            if (where === null){
                return;
            }
            if ('forEach' in where){
                where.forEach(doFind);
            }else {
                for (var key in where){
                    doFind(where[key]);
                }
            }
        }
    }
    doFind(where);
    return matches;
}

function deepCompare(what, where){
    if (typeof what !== 'object'){
        if (typeof where !== 'object'){
            return what === where;
        }else {
            return false;
        }
    }else {
        if ('length' in what){
            /* array like */
            if ('length' in where){
                if (what.length === where.length){
                    return what.every(function compare(whatItem, i){
                        return deepCompare(whatItem, where[i]);
                    });
                }else {
                    return false;
                }
            }else {
                return false;
            }
        }else {
            if (typeof where !== 'object'){
                return false;
            }
            if (where === null || what === null){
                return where === what;
            }
            /* object like */
            for (var key in what){
                if (key in where){
                    if (!deepCompare(what[key], where[key])){
                        return false;
                    }
                }else {
                    return false;
                }
            }
            return true;
        }
    }
}