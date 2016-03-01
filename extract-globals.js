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

var key, names = [];

for (key in data) {
    names.push(key);
}

for (key in data2) {
    names.push(key);
}

names = names.sort();

var result = {};

names.forEach(function(name) {
    result[name] = true;
});

fs.writeFileSync(to, JSON.stringify(result, null, '    '), 'utf-8');
