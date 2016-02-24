var fs = require('fs'),
    path = require('path'),
    vow = require('vow'),
    vowFs = require('vow-fs'),
    colors = require('colors'),
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
        console.log('all done');
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
        console.log('\t' + 'OK'.green + '\t' + base);
    }, function(e) {
        console.error('\t' + 'FAIL'.red + '\t' + base + '\n\t' + e.stack);
    });
}

function compare(dest, ethalon) {
    return vow.all([dest, ethalon].map(function(path) {
        return vowFs.read(path, 'utf-8');
    })).then(function(files) {
        if (files[0] !== files[1]) {
            var str = ('Not equal:\nexpected: "' + files[1].green + '"\n  actual: "' + files[0].red + '"');
            console.error(str.stack);
            throw new Error(str);
        }
    });
}
if (process.argv < 3) {
    console.error('no tests specified');
    return;
}
var tests = process.argv.slice(2).sort();

run(tests);