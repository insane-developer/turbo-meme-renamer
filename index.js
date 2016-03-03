var fs = require('fs'),
    path = require('path'),
    parser = require('esprima'),
    transformer = require('./lib/transformer.js'),
    codegen = require('./lib/writer.js'),
    vow = require('vow'),
    vowFs = require('vow-fs'),
    differ = require('diff'),
    colors = require('colors'),
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
        var ast;
        try {
            ast = parser.parse(data, {
                loc: true,
                range: true,
                attachComment: true,
                tokens: true
            });

        } catch (e) {
            e.message = 'WTF in ' + resolved + ':\n' + e.message;
            throw e;
        }
        ast.file = resolved;
        ast = transformer(ast, data, require('./args.js'));

        try{
            compiled = codegen.generate(ast, {
                format: {
                    quotes: 'auto'
                },
                comment: true
            }, data);
        } catch(e) {
            console.log('too bad.', e.stack);
        }
        if (options.warn) {
            return;
        }
        if (!options.write) {
            if (data !== compiled) {
                console.log('Changes in', resolved);
                var diff = differ.diffWords(data, compiled).map(function(part) {
                    var color = part.added ? 'green' : part.removed ? 'red' : 'white';
                    part.value = part.value.replace(/\s/g, function(match) {
                        var whtspcColor = color === 'white' ? 'gray' : color;
                        switch (match) {
                            case ' ':
                                return '.'[whtspcColor] + ''[color];
                            case '\r':
                                return '\\r'[whtspcColor] + '\r'[color];
                            case '\n':
                                return '\\n'[whtspcColor] + '\n'[color];
                            case '\t':
                                return '--->'[whtspcColor] + ''[color];
                                default:
                                    return match[color];
                        }
                    });
                    return part.value[color];
                }).join('');
                
                console.log(diff);
            } else {
                console.error('No changes', resolved);
            }
        } else {
            if (data === compiled) {
                return vow.resolve();
            } else {
                return vowFs.write(resolved, compiled, 'utf-8').then(function() {
                    console.log('Записан:', file);
                });
            }
        }
    });
}
