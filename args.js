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

function Export(name, tmpl, old) {
    this.type = 'ExportNamedDeclaration';
    if (old) {
        this.start = old.start;
        this.end = old.end;
        this.range = old.range;
    }
    let body = tmpl.body;

    if (body.type !== 'BlockStatement') {
        body = {
            type: 'BlockStatement',
            body: [
                {
                    type: 'ReturnStatement',
                    argument: body
                }
            ]
        };
    }
    this.declaration = {
        type: 'FunctionDeclaration',
        id: new Identifier(name),
        params: tmpl.params,
        body: body,
        isExpression: false
    };
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

function safeName(name) {
    return name
        .replace(/(\W)(\w)/g, (m, pre, char) => {
            if (pre === '-') {
                return char.toUpperCase();
            } else {
                return '_' + char;
            }
        })
        .replace(/^([^a-z_])/i, '_$1');
}
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
            func = scope.getValue(func);
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
        console.log(`view "${name}" detected ${tmpl.type}`);

        if (tmpl.type === 'ArrowFunctionExpression' ||
            tmpl.type === 'FunctionExpression' ||
            tmpl.type === 'FunctionDeclaration') {
            node.isDeclaration = new Export(safeName(name), tmpl, node);
            return;
        }


        node.isViewDeclaration = true;
        var str = `\n<!--${name}-->\n${toHtml(tmpl, scope)}\n`;
        this.saveTmpl(str);
    },
    onCallExpressionLeave: function (node, parent, scope, walker) {
        if (node.isViewDeclaration) {
            walker.remove();
            return;
        }
        if (node.isDeclaration) {
            return node.isDeclaration;
        }
        return node;
    }
};