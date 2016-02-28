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
    wordWithLabelStatement: function(name, node) {
        var label = '';
        if (node.label) {
            label = this.space(node.start + name.length, node.label.start) +
                this.processNode(node.label);
        }
        return name + label +';';
    },
    opPrecedence: function(node) {
        switch (node.type) {
            default:
                return 20;
            case 'MemberExpression':
            case 'NewExpression':
                return 18;
            case 'UpdateExpression':
                return node.prefix ? 15 : 16;
            case 'UnaryExpression':
                switch (node.operator) {
                    case '!':
                    case '~':
                    case '+':
                    case '-':
                    case 'typeof':
                    case 'void':
                    case 'delete':
                        return 15;
                    default:
                        throw new Error('WTF unary operator ' + node.operator);
                }
            
            case 'BinaryExpression':
                switch (node.operator) {
                    case '**':
                    case '*':
                    case '/':
                    case '%':
                        return 14;
                    case '+':
                    case '-':
                        return 13;
                    case '<<':
                    case '>>':
                    case '>>>':
                        return 12;
                    case '<':
                    case '<=':
                    case '>':
                    case '>=':
                    case 'in':
                    case 'instanceof':
                        return 11;
                    case '==':
                    case '!=':
                    case '===':
                    case '!==':
                        return 10;
                    case '&':
                        return 9;
                    case '^':
                        return 8;
                    case '|':
                        return 7;
                    default:
                        throw new Error('WTF binary operator ' + node.operator);
                }
            case 'LogicalExpression':
                switch (node.operator) {
                    case '&&':
                        return 6;
                    case '||':
                        return 5;
                    default:
                        throw new Error('WTF logical operator ' + node.operator);
                }
            case 'ConditionalExpression':
                return 4;
            case 'AssignmentExpression':
                return 3;
            case 'SequenceExpression':
                return 0;
        }
    },
    binaryExpression: function (node) {
            var left = this.processNode(node.left),
                right = this.processNode(node.right),
                curOp = this.opPrecedence(node);
            if (this.opPrecedence(node.left) < curOp) {
                left = '(' + left + ')';
            }
            if (this.opPrecedence(node.right) < curOp) {
                right = '(' + right + ')';
            }
            return left + ' ' + node.operator + ' ' + right;
    },
    callExpression: function(node) {
        var args;
        if (node.arguments.length) {
            args = this.space(node.callee.end, node.arguments[0].start) + '(' +
                this.processArray(node.arguments, ',') +
                this.space(node.arguments.pop().end, node.end - 1) + ')';
        } else {
            args = '(' + this.space(node.callee.end + 2, node.end) + ')';
        }
        return this.processNode(node.callee) + args;
    },
    functionExpression: function (node) {
        var start = node.start + 8,
            str = 'function';
        if (node.id) {
            str += this.space(node.start, node.id.start) +
            this.processNode(node.id);
            start = node.id.end;
        }

        if (node.params.length) {
            str += this.space(start, node.params[0].start) +
                '(' +
                this.processArray(node.params, ',') +
                ')';
            start = node.params.pop().end + 1;
        } else {
            str += '()';
            start += 2;
        }
        str += this.space(start, node.body.start) + this.processNode(node.body);
        return str;
    },
    processNode: function(node) {
        var result = '';
        if (!node) {
            return '';
        }
        try {
            switch (node.type) {
                case 'ExpressionStatement':
                    return this.processNode(node.expression) + ';';
                    break;
                case 'EmptyStatement':
                    return ';';
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
                    return this.wordWithLabelStatement('break', node);
                    break;
                case 'ContinueStatement':
                    return this.wordWithLabelStatement('continue', node);
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
                        this.space(node.start, node.block.start) +
                        this.processNode(node.block) +
                        this.space(node.block.end, node.handler.start) +
                        this.processNode(node.handler) +
                        (node.finalizer ?
                            this.space(node.handler.end, node.finalizer.start - 7) +
                            'finally' +
                            this.processNode(node.finalizer)
                            : '');
                    break;
                case 'WhileStatement':
                    return 'while (' + this.processNode(node.test) + ') ' +
                        this.processNode(node.body);
                    break;
                case 'DoWhileStatement':
                    return 'do' +
                        this.space(node.start + 2, node.body.start - 1) +
                        this.processNode(node.body) +
                        ' while (' + this.processNode(node.test) + ');';
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
                    var parenthisedExpr = 'for (' +
                        this.processNode(node.init).replace(/;$/, '') + ';' +
                        this.processNode(node.test) + ';' +
                        this.processNode(node.update) + ')';
                    return parenthisedExpr +
                        this.space(node.start + parenthisedExpr.length, node.body.start) +
                        this.processNode(node.body);
                case 'ForInStatement':
                    var parenthisedExpr = 'for (' + this.processNode(node.left).replace(/;$/, '') +
                        ' in ' + this.processNode(node.right) + ')';
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
                case 'FunctionDeclaration':
                    return this.functionExpression(node);
                    break;
                case 'VariableDeclaration':
                    return node.kind +
                        this.space(node.start + node.kind.length, node.declarations[0].start) +
                        this.processArray(node.declarations, ',') + ';';
                    break;
                case 'VariableDeclarator':
                    if (!node.init) {
                        return this.processNode(node.id);
                    }
                    return this.processNode(node.id) + ' =' +
                        this.space(node.id.end + 2, node.init.start) +
                        this.processNode(node.init);
                    break;
                case 'ThrowStatement':
                    return 'throw' + this.space(node.start + 5, node.argument.start) +
                        this.processNode(node.argument) + ';';
                    break;
                case 'ReturnStatement':
                    return 'return' + this.space(node.start + 6, node.argument.start) +
                        this.processNode(node.argument) + ';';
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
                case 'AssignmentExpression':
                    return this.processNode(node.left) + ' = ' + this.processNode(node.right);
                    break;
                case 'BinaryExpression':
                    return this.binaryExpression(node);
                    break;
                case 'CallExpression':
                    return this.callExpression(node);
                    break;
                case 'ConditionalExpression':
                    return this.processNode(node.test) + '?' +
                        this.processNode(node.consequent) + ':' +
                        this.processNode(node.alternate);
                    break;
                case 'FunctionExpression':
                    return this.functionExpression(node);
                    break;
                case 'MemberExpression':
                    return this.processNode(node.object) +
                        (node.computed ? '[' : '.') +
                        this.processNode(node.property) +
                        (node.computed ? ']' : '');
                    break;
                case 'NewExpression':
                    return 'new ' + this.space(node.start + 4, node.callee.start) + this.callExpression(node);
                    break;
                case 'ThisExpression':
                    return 'this';
                case 'ObjectExpression':
                    if (node.properties.length) {
                        return '{' +
                            this.space(node.start + 1, node.properties[0].start) +
                            this.processArray(node.properties, ',') +
                            this.space(node.properties.pop().end, node.end - 1) +
                            '}';
                    } else {
                        return '{' + this.space(node.start + 1, node.end - 1) + '}';
                    }
                    break;
                case 'Property':
                    if (node.kind !== 'init') {
                        throw new TypeError('Don\'t know how to build property on kind ' + node.kind);
                    }
                    return this.processNode(node.key) + ': ' + this.processNode(node.value);
                    break;
                case 'LogicalExpression':
                    return this.binaryExpression(node);
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
                case 'SequenceExpression':
                    return this.processArray(node.expressions, ',');
                    break;
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
        var length = end - start,
            str = '';
        if (length) {
            var str = this.raw.substr(start, length);
        }
        return str.replace(/\S/g, '');
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