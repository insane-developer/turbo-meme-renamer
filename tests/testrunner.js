var fs = require('fs'),
    path = require('path'),
    vow = require('vow'),
    vowFs = require('vow-fs'),
    colors = require('colors'),
    diff = require('diff'),
    module = require('../index.js');
module.configure({
    write: true
});
function run(tests) {
    var failed = 0;
    tests.reduce(function(prev, curr) {
        return prev.then(function() {
            return runTest(curr).catch(function(e) {
                failed++;
            });
        });
    }, vow.resolve()).then(function() {
        if (!failed) {
            console.log('Tests passed'.green);
        } else {
            console.error((failed + ' failed').red);
        }
    }, function(e) {
        console.error('Unexpected error'.red, e);
    });
}

function runTest(test) {
    test = path.resolve(test);
    var ext = '.test.js',
        base = path.basename(test, ext),
        dir = path.dirname(test),
        dest = test.replace(ext, '.dest.js'),
        etalon = test.replace(ext, '.eth.js');
    if (!fs.existsSync(test)) {
        throw new Error('EEXIST: ' + test);
    }
    if (!fs.existsSync(etalon)) {
        throw new Error('EEXIST: ' + etalon);
    }
    fs.writeFileSync(dest, fs.readFileSync(test));
    return module.process([dest]).then(function(){
        return compare(dest, etalon, /whitespace/.test(base));
    }).then(function() {
        console.log('  v'.green + ' ' + base);
    }, function(e) {
        console.error('  x'.red + ' ' + base + '\n\t' + e.stack);
        throw e;
    });
}

function compare(dest, ethalon, strictWhitespace) {
    return vow.all([dest, ethalon].map(function(path) {
        return vowFs.read(path, 'utf-8');
    })).then(function(files) {
        var equal = true, diffed = diff.diffChars(files[0], files[1]).map(function(part) {
            var color = part.added ? 'green' : part.removed ? 'red' : 'white';
            if (strictWhitespace) {
                part.value = part.value.replace(/\s/g, function(match) {
                    switch (match) {
                        case ' ':
                            return '.'.dim;
                        case '\r':
                            return '\\r'.dim + '\r';
                        case '\n':
                            return '\\n'.dim + '\n';
                        case '\t':
                            return '--->'.dim;
                            default:
                                return match;
                    }
                });
            }
            if (color !== 'white' && /\S/.test(part.value)) {
                equal = false;
            }
            return part.value[color];
        }).join('');
        if (!equal) {
            var str = 'Not equal.' + ' Expected'.green + ' Actual'.red;
            str += '\n' + diffed;
            console.error(str.stack);
            throw new Error(str);
        }
    });
}
if (process.argv < 3) {
    console.error('No tests specified');
    return;
}
var tests = process.argv.slice(2).sort();

run(tests);