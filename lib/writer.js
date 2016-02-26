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
                    this.getWhitespaceBetween(node.expression.end, node.end);
                    break;
                case 'BlockStatement':
                    if (node.body.length) {
                        return '{' +
                            this.getWhitespaceBetween(node.start + 1, node.body[0].start) +
                            this.processArray(node.body) +
                            this.getWhitespaceBetween(node.body.pop().end, node.end - 1) +
                            '}';
                    } else {
                        return '{' + this.getWhitespaceBetween(node.start + 1, node.end - 1) + '}';
                    }
                    break;
                case 'ContinueStatement':
                    return 'continue' +
                        (node.label ? this.getWhitespaceBetween(node.start + 8,node.label.start) +
                            this.processNode(node.label) : '');
                    break;
                case 'IfStatement':
                    return 'if' +
                        this.getWhitespaceBetween(node.start + 2, node.test.start - 1) +
                        '(' + this.processNode(node.test) + ')' +
                        this.getWhitespaceBetween(node.test.end + 1, node.consequent.start) +
                        this.processNode(node.consequent) +
                        (node.alternate ? ' else ' + this.processNode(node.alternate) : '');
                    break;
                case 'LabeledStatement':
                    return this.processNode(node.label) + ':' +
                        this.getWhitespaceBetween(node.label.end + 1, node.body.start) +
                        this.processNode(node.body);
                    break;
                case 'TryStatement':
                    return 'try' + 
                        this.getWhitespaceBetween(node.start + 3, node.block.start) +
                        this.processNode(node.block) +
                        this.getWhitespaceBetween(node.block.end, node.handler.start) +
                        this.processNode(node.handler) +
                        (node.finalizer ?
                            this.getWhitespaceBetween(node.handler.end, node.finalizer.start) +
                            this.processNode(node.finalizer)
                            : '');
                    break;
                case 'WhileStatement':
                    return 'while (' + this.processNode(node.test) + ')' +
                        this.processNode(node.body);
                    break;
                case 'DoWhileStatement':
                    return 'do ' +
                        this.getWhitespaceBetween(node.start + 2, node.body.start - 1) +
                        this.processNode(node.body) +
                        ' while (' + this.processNode(node.test) + ')' +
                        this.getWhitespaceBetween(node.test.end + 1, node.end);
                case 'SwitchStatement':
                    return '!!SwitchStatement!!';
                case 'ForStatement':
                    var parenthisedExpr = 'for (' + this.processArray([node.init, node.test, node.update], ';') + ')';
                    return parenthisedExpr +
                        this.getWhitespaceBetween(node.start + parenthisedExpr.length, node.body.start) +
                        this.processNode(node.body);
                case 'VariableDeclaration':
                    return node.kind +
                        this.getWhitespaceBetween(node.start + node.kind.length, node.declarations[0].start) +
                        this.processArray(node.declarations, ',') + ';';
                    break;
                case 'VariableDeclarator':
                    return this.processNode(node.id) + ' =' +
                        this.getWhitespaceBetween(node.id.end + 2, node.init.start) +
                        this.processNode(node.init);
                    break;
                case 'ReturnStatement':
                    return 'return' + this.getWhitespaceBetween(node.start + 6, node.argument.start) +
                        this.processNode(node.argument) + 
                        this.getWhitespaceBetween(node.argument.end, node.end);
                    break;
                case 'CatchClause':
                    return "!!CatchClause!!";
                case 'ArrayExpression':
                    if (node.elements.length) {
                        return '[' +
                            this.getWhitespaceBetween(node.start + 1, node.elements[0].start) +
                            this.processArray(node.elements, ',') +
                            this.getWhitespaceBetween(node.elements.pop().end, node.end - 1) +
                            ']';
                    } else {
                        return '[' + this.getWhitespaceBetween(node.start + 1, node.end -1) + ']';
                    }
                    break;
                case 'BinaryExpression':
                    return this.processNode(node.left) +
                        ' ' + node.operator +
                        this.getWhitespaceBetween(node.left.end + 1 + node.operator.length, node.right.start) +
                        this.processNode(node.right);
                    break;
                case 'CallExpression':
                    return this.processNode(node.callee) +
                        (node.arguments.length && this.getWhitespaceBetween(node.callee.end, node.arguments[0].start)) +
                        '(' +
                        this.processArray(node.arguments, ',') +
                        (node.arguments.length && this.getWhitespaceBetween(node.arguments.pop().end, node.end)) +
                        ')';
                    break;
                case 'FunctionExpression':
                    var start = node.start + 8,
                        str = 'function';
                    if (node.id) {
                        str += this.getWhitespaceBetween(node.start, node.id.start) +
                        this.processNode(id);
                        start = node.id.end;
                    }
                    str += '(';
                    if (node.params.length) {
                        str += this.getWhitespaceBetween(start, node.params[0].start) +
                            this.processArray(node.params, ',');
                        start = node.params.pop().end;
                    }
                    str += ')';
                    str += this.getWhitespaceBetween(start, node.body.start) + this.processNode(node.body)
                    return str;
                    break;
                case 'MemberExpression':
                    return this.processNode(node.object) +
                        (node.computed ? '[' : '.') +
                        this.processNode(node.property) +
                        (node.computed ? ']' : '');
                    break;
                case 'UnaryExpression':
                    if (!node.prefix) {
                        throw new TypeError('Don\'t know whaat to do with prefix === false of "' + node.type + '"');
                    }
                    return node.operator +
                        this.getWhitespaceBetween(node.start + node.operator.length, node.argument.start) +
                        this.processNode(node.argument);
                    break;
                case 'UpdateExpression':
                    if (node.prefix) {
                        return node.operator +
                            this.getWhitespaceBetween(node.start + node.operator.length, node.argument.start) +
                            this.processNode(node.argument);
                    } else {
                        return this.processNode(node.argument) +
                            this.getWhitespaceBetween(node.argument.end, node.end - node.operator.length) +
                            node.operator;
                    }
                case 'Identifier':
                    return node.name;
                    break;
                case 'Literal':
                    return (typeof node.value === 'string' ? "'" + node.value.replace(/'/, "\\'") + "'" : node.value);
                case 'Program':
                    result = this.getWhitespaceBetween(node.start, node.body[0].start) +
                        this.processArray(node.body) +
                        this.getWhitespaceBetween(node.body.pop().end, node.end);
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
    getWhitespaceBetween: function(start, end) {
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
                result += this.getWhitespaceBetween(items[i - 1].end + separator.length, item.start);
            }
            return result + this.processNode(item);
        }, this).join('');
    }
};