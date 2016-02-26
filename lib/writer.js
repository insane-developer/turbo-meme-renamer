var comments, tokens;
module.exports = {
    attachComments: function(ast, comments, tokens) {
        this.comments = comments;
        this.tokens = tokens
    },
    generate: function generate(ast, options, raw) {
        this.raw = raw;
        return this.processNode(ast);
    },
    processNode: function(node) {
        var result = '';
        try {
            switch (node.type) {
                case 'ExpressionStatement':
                    return this.processNode(node.expression) +
                    this.space(node.expression.end, node.end);
                    break;
                case 'BlockStatement':
                    if (node.body.length) {
                        return '{' +
                            this.space(node.start + 1, node.body[0].start) +
                            this.processArray(node.body) +
                            this.space(node.body.pop().end, node.end - 1) +
                            '}';
                    } else {
                        return '{' + this.space(node.start + 1, node.end - 1) + '}';
                    }
                    break;
                case 'BreakStatement':
                    return 'break' +
                        (node.label ? this.space(node.start + 5, node.label.start) +
                            this.processNode(node.label) : '');
                    break;
                case 'ContinueStatement':
                    return 'continue' +
                        (node.label ? this.space(node.start + 8, node.label.start) +
                            this.processNode(node.label) : '');
                    break;
                case 'IfStatement':
                    return 'if' +
                        this.space(node.start + 2, node.test.start - 1) +
                        '(' + this.processNode(node.test) + ')' +
                        this.space(node.test.end + 1, node.consequent.start) +
                        this.processNode(node.consequent) +
                        (node.alternate ? ' else ' + this.processNode(node.alternate) : '');
                    break;
                case 'LabeledStatement':
                    return this.processNode(node.label) + ':' +
                        this.space(node.label.end + 1, node.body.start) +
                        this.processNode(node.body);
                    break;
                case 'TryStatement':
                    return 'try' + 
                        this.space(node.start + 3, node.block.start) +
                        this.processNode(node.block) +
                        this.space(node.block.end, node.handler.start) +
                        this.processNode(node.handler) +
                        (node.finalizer ?
                            this.space(node.handler.end, node.finalizer.start) +
                            this.processNode(node.finalizer)
                            : '');
                    break;
                case 'WhileStatement':
                    return 'while (' + this.processNode(node.test) + ')' +
                        this.processNode(node.body);
                    break;
                case 'DoWhileStatement':
                    return 'do ' +
                        this.space(node.start + 2, node.body.start - 1) +
                        this.processNode(node.body) +
                        ' while (' + this.processNode(node.test) + ')' +
                        this.space(node.test.end + 1, node.end);
                    break;
                case 'SwitchStatement':
                    return 'switch' +
                        this.space(node.start + 6, node.discriminant.start - 1) +
                        '(' + this.processNode(node.discriminant) + ') {' +
                        this.space(node.discriminant.end + 2, node.cases[0]) +
                        this.processArray(node.cases) +
                        this.space(node.cases.pop().end, node.end - 1) + '}';
                    break;
                case 'ForStatement':
                    var parenthisedExpr = 'for (' + this.processArray([node.init, node.test, node.update], ';') + ')';
                    return parenthisedExpr +
                        this.space(node.start + parenthisedExpr.length, node.body.start) +
                        this.processNode(node.body);
                case 'SwitchCase':
                    var prepend = 'default:';
                    if (node.test) {
                        prepend = 'case' + this.space(node.start + 4, node.test.start) +
                        this.processNode(node.test) + ':';
                    }
                    if (node.consequent.length) {
                        return prepend +
                            this.space(node.start + prepend.length, node.consequent[0].start) +
                            this.processArray(node.consequent);
                    } else {
                        return prepend;
                    }
                    break;
                case 'VariableDeclaration':
                    return node.kind +
                        this.space(node.start + node.kind.length, node.declarations[0].start) +
                        this.processArray(node.declarations, ',') + ';';
                    break;
                case 'VariableDeclarator':
                    return this.processNode(node.id) + ' =' +
                        this.space(node.id.end + 2, node.init.start) +
                        this.processNode(node.init);
                    break;
                case 'ThrowStatement':
                    return 'throw' + this.space(node.start + 5, node.argument.start) +
                        this.processNode(node.argument) +
                        this.space(node.argument.end, node.end);
                    break;
                case 'ReturnStatement':
                    return 'return' + this.space(node.start + 6, node.argument.start) +
                        this.processNode(node.argument) + 
                        this.space(node.argument.end, node.end);
                    break;
                case 'CatchClause':
                    return 'catch' +
                        this.space(node.start + 5, node.param.start - 1) + '(' +
                        this.processNode(node.param) + ')' +
                        this.space(node.param.end + 1, node.body.start) +
                        this.processNode(node.body);
                    break;
                case 'ArrayExpression':
                    if (node.elements.length) {
                        return '[' +
                            this.space(node.start + 1, node.elements[0].start) +
                            this.processArray(node.elements, ',') +
                            this.space(node.elements.pop().end, node.end - 1) +
                            ']';
                    } else {
                        return '[' + this.space(node.start + 1, node.end -1) + ']';
                    }
                    break;
                case 'BinaryExpression':
                    return this.processNode(node.left) +
                        ' ' + node.operator +
                        this.space(node.left.end + 1 + node.operator.length, node.right.start) +
                        this.processNode(node.right);
                    break;
                case 'CallExpression':
                    return this.processNode(node.callee) +
                        (node.arguments.length ? this.space(node.callee.end, node.arguments[0].start) : '') +
                        '(' +
                        this.processArray(node.arguments, ',') +
                        (node.arguments.length ? this.space(node.arguments.pop().end, node.end) : '') +
                        ')';
                    break;
                case 'FunctionExpression':
                    var start = node.start + 8,
                        str = 'function';
                    if (node.id) {
                        str += this.space(node.start, node.id.start) +
                        this.processNode(id);
                        start = node.id.end;
                    }
                    str += '(';
                    if (node.params.length) {
                        str += this.space(start, node.params[0].start) +
                            this.processArray(node.params, ',');
                        start = node.params.pop().end;
                    }
                    str += ')';
                    str += this.space(start, node.body.start) + this.processNode(node.body)
                    return str;
                    break;
                case 'MemberExpression':
                    return this.processNode(node.object) +
                        (node.computed ? '[' : '.') +
                        this.processNode(node.property) +
                        (node.computed ? ']' : '');
                    break;
                case 'NewExpression':
                    return '!!NewExpression!!';
                    break;
                case 'UnaryExpression':
                    if (!node.prefix) {
                        throw new TypeError('Don\'t know whaat to do with prefix === false of "' + node.type + '"');
                    }
                    return node.operator +
                        this.space(node.start + node.operator.length, node.argument.start) +
                        this.processNode(node.argument);
                    break;
                case 'UpdateExpression':
                    if (node.prefix) {
                        return node.operator +
                            this.space(node.start + node.operator.length, node.argument.start) +
                            this.processNode(node.argument);
                    } else {
                        return this.processNode(node.argument) +
                            this.space(node.argument.end, node.end - node.operator.length) +
                            node.operator;
                    }
                case 'Identifier':
                    return node.name;
                    break;
                case 'Literal':
                    return (typeof node.value === 'string' ? "'" + node.value.replace(/'/, "\\'") + "'" : node.value);
                case 'Program':
                    result = this.space(node.start, node.body[0].start) +
                        this.processArray(node.body) +
                        this.space(node.body.pop().end, node.end);
                    break;
                default:
                    throw new TypeError('Don\'t know how to write type "' + node.type + '"');
            }
        } catch(e) {
            e.message += '\n\tin ' + node.type;
            throw e;
        }
        return result;
    },
    space: function(start, end) {
        var length = end - start;
        if (length) {
            return this.raw.substr(start, length).replace(/[^\s;]/g, '');
        }
        return '';
    },
    processArray: function(nodes, separator) {
        if (!nodes.length) {
            return '';
        }
        separator = separator || '';
        return nodes.map(function(item, i, items) {
            var result = i ? separator : '';
            if (!item) {
                return result;
            }
            if (i) {
                result += this.space(items[i - 1].end + separator.length, item.start);
            }
            return result + this.processNode(item);
        }, this).join('');
    }
};