#!/usr/bin/env node
if (process.argv.length < 4) {
    console.error('<from> <to>');
    return;
}
var fs = require('fs'),
    path = require('path'),
    to = path.resolve(process.argv.pop()),
    from = path.resolve(process.argv.pop());

var data = require(from),
    data2 = {};

if (fs.existsSync(to)) {
    data2 = require(to);
}

var key, result = {};

for (key in data) {
    result[key] = true;
}

for (key in data2) {
    result[key] = true;
}

fs.writeFileSync(to, JSON.stringify(result, null, '    '), 'utf-8');
