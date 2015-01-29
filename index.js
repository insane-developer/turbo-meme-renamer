var fs = require('fs'),
    path = require('path'),
    uglify = require('uglify-js');

module.exports = function(files){
    if(!files && files.length){
        console.log('No files');
        return;
    }
    files.forEach(function readFile(file){
        var resolved = path.resolve(file);
        fs.readFile(resolved, 'utf-8', readFile);
    });
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
    var ast = uglify.parse(data);
    console.log('fine', resolved);
}