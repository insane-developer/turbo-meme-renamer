/* eslint-env es6 */
var path = require('path'),
    parser = require('esprima'),
    transformer = require('./lib/transformer.js'),
    codegen = require('./lib/writer.js'),
    vowFs = require('vow-fs'),
    differ = require('diff'),
    colors = require('colors'),
    options = {};

module.exports = {
    process: function(files){
        if (!files && files.length){
            return Promise.reject('No files');
        }
        return Promise.all(files.map(readFile));
    },
    configure: function(_options){
        options = _options;
    }
};

function readFile(file){
    var resolved = path.resolve(file);
    return vowFs.read(resolved, 'utf-8').then(function prepareForTheTrick(data){
        var ast,
            compiled;
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
        var args = require('./args.js');
        ast = transformer(ast, args);

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
            if (args.getTmpls().length) {
                console.log('Temaplates extracted from ', resolved);
                console.log(args.getTmpls().join('\n').green);
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
                }
            } else {
                console.error('No changes', resolved);
            }
        } else {
            if (args.getTmpls().length) {
                require('fs').writeFileSync(resolved.replace(/\.js$/, '.html'), args.getTmpls().join('\n'), {
                    encoding: 'utf-8',
                    flag: 'a'
                });
                if (data !== compiled) {
                    return vowFs.write(resolved, compiled, 'utf-8').then(function() {
                        console.log('Записан:', file);
                    });
                }
            }
            return Promise.resolve();
        }
    });
}
