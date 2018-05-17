/* eslint-env es6 */
var globalWhitelist = require('./globals'),
    globalBlacklist = require('./blacklist'),
    walker = require('estraverse'),
    filename = '';

function Identifier(name, old) {
    this.type = 'Identifier';
    if (old) {
        this.start = old.start;
        this.end = old.end;
        this.range = old.range;
    }
    this.name = name;
}

function cleanRemovedVars(ast, removed) {
    return walker.replace(ast, {
        leave: function (node) {
            if (node.type === 'VariableDeclarator' && !node.init && removed[node.id.name]) {
                this.remove();
            }
        }
    });
}

function toHtml(node, scope) {
    var str = '';
    var beautify = require('html-beautify');
    walker.replace(node, {
        leave: function (node) {
            var resolved = scope.getValue(node);

            if (resolved === undefined) {
                throw new TypeError(`node of type ${node.type} (${node.name} ${node.value}) resolved to undefined`);
            }
            if (typeof resolved !== 'object') {
                str += resolved;
                return;
            } else {
                node = resolved;
            }
            switch(node.type) {
                case 'Literal':
                    str += node.value;
                    break;
                case 'BinaryExpression':
                    if (node.operator === '+') {
                        break;
                    }
                default:
                    throw new TypeError(`Invalid node ${node.type}!${node.name} ${node.value}`);
            }
        }
    });
    return beautify(str);
}

function location(node) {
    return (filename ? 'in ' + filename : '') +
        (node.loc && node.loc.start ? ' at line ' + node.loc.start.line + ', col ' + node.loc.start.column : '');
}
var tmpls = [];
module.exports = {
    setFile: function (file) {
        tmpls = [];
        filename = file;
    },
    saveTmpl: function (str) {
        tmpls.push(str);
    },
    getTmpls: function () {
        return tmpls;
    },
    onCallExpression: function(node, parent, scope) {
        var func = node.callee;
        if (func.type === 'Identifier') {
            func = scope.getValue(node.callee);
        }
        if (!func || func.type !== 'Identifier' || func.name !== 'views') {
            return;
        }
        var args = node.arguments,
            name = scope.getValue(args[0]),
            tmpl = scope.getValue(args[1]);
        if (name.value) {
            name = name.value;
        }
        if (tmpl.type === 'FunctionExpression' || tmpl.type === 'FunctionDeclaration') {
            return;
        }

        console.log(`view "${name}" detected`);

        node.isViewDeclatarion = true;
        var str = `\n<!--${name}-->\n${toHtml(tmpl, scope)}\n`;
        this.saveTmpl(str);
    },
    onCallExpressionLeave: function (node, parent, scope, walker) {
        if (node.isViewDeclatarion) {
            walker.remove();
            return;
        }
        return node;
    }
};