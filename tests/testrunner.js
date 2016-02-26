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
    tests.reduce(function(prev, curr) {
        return prev.then(function() {
            return runTest(curr);
        });
    }, vow.resolve()).then(function() {
        console.log('Tests passed'.green);
    }, function(e) {
        console.error('Tests failed'.red);
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
        return compare(dest, etalon);
    }).then(function() {
        console.log('OK'.green + '\t' + base);
    }, function(e) {
        console.error('FAIL'.red + '\t' + base + '\n\t' + e.stack);
        throw e;
    });
}

function compare(dest, ethalon) {
    return vow.all([dest, ethalon].map(function(path) {
        return vowFs.read(path, 'utf-8');
    })).then(function(files) {
        var equal = true, diffed = diff.diffWords(files[0], files[1]).map(function(part) {
            var color = part.added ? 'green' : part.removed ? 'red' : 'white';
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