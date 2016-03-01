var walker = require('estraverse');
module.exports = {
    attachComments: function(ast, comments, tokens) {
        this.comments = comments;
        this.tokens = tokens;
    },
    generate: function generate(ast, options, raw) {
        this.raw = raw;
        ast = this.normalizeRange(ast);
        if (ast.tokens) {
            this.tokens = ast.tokens;
        }
        if (ast.comments) {
            this.comments = ast.comments;
        }
        /* raw text pointer */
        this.r = 0;
        /* punctuator pointer */
        this.p = 0;
        /* comments pointer */
        this.c = 0;

        this.tokens = this.tokens.filter(function(token) {
            if (!token.start) {
                token.start = token.range[0];
            }
            if (!token.end) {
                token.end = token.range[1];
            }
            return token.type === 'Punctuator' || token.type === 'Keyword';
        });

        this.comments.forEach(function(comment) {
            if (!comment.start) {
                comment.start = comment.range[0];
            }
            if (!comment.end) {
                comment.end = comment.range[1];
            }
        });
        return this.processNode(ast);
    },
    normalizeRange: function(ast) {
        return walker.replace(ast, {
            enter: function(node) {
                if (!node.start) {
                    node.start = node.range && node.range[0];
                }
                if (!node.end) {
                    node.end = node.range && node.range[1];
                }
            }
        });
    },
    wordWithLabelStatement: function(name, node) {
        var label = '';
        if (node.label) {
            label = this.space(node.start + name.length, node.label.start) +
                this.processNode(node.label);
        }
        return name + label + ';';
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
                break;
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
                break;
            case 'LogicalExpression':
                switch (node.operator) {
                    case '&&':
                        return 6;
                    case '||':
                        return 5;
                    default:
                        throw new Error('WTF logical operator ' + node.operator);
                }
                break;
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
        var callee = this.csp(node.start, node.callee.start) +
            this.processNode(node.callee) +
            this.csp(node.callee.end, node.arguments.length ? node.arguments : node.end),
            args = '';

        if (node.arguments.length) {
            args = this.processArray(node.arguments, [',', ' ']) +
                this.csp(node.arguments, node.end, ')');
        }
        return callee + args;
    },
    functionExpression: function (node) {
        var str = 'function';
        if (node.id) {
            str += this.csp(node.start + 8, node.id.start, ' ') +
                this.processNode(node.id);
        }

        if (node.params.length) {
            str += this.csp(node.id ? node.id.end : node.start + 8, node.params, '(') +
                this.processArray(node.params, [',', ' ']) +
                this.csp(node.params, node.body.start, [')', ' ']);
        } else {
            str += this.csp(node.id ? node.id.end : node.start + 8, node.body.start, ['(', ')']);
        }
        str += this.processNode(node.body);
        return str;
    },
    processNode: function(node) {
        if (!node) {
            return '';
        }
        try {
            switch (node.type) {
                case 'ExpressionStatement':
                    return this.processNode(node.expression) +
                        this.csp(node.expression.end, node.end, ';');

                case 'EmptyStatement':
                    return this.csp(node.start, node.end, ';');

                case 'BlockStatement':
                    if (node.body.length) {
                        return this.csp(node.start, node.body, '{') +
                            this.processArray(node.body) +
                            this.csp(node.body, node.end, '}');
                    } else {
                        return this.csp(node.start, node.end, ['{', '}']);
                    }
                    break;
                case 'BreakStatement':
                    return this.wordWithLabelStatement('break', node);

                case 'ContinueStatement':
                    return this.wordWithLabelStatement('continue', node);

                case 'IfStatement':
                    return this.csp(node.start, node.test.start, ['if', '(']) +
                        this.processNode(node.test) +
                        this.csp(node.test.end, node.consequent.start, ')') +
                        this.processNode(node.consequent) +
                        (node.alternate ?
                            this.csp(node.consequent.end, node.alternate.start, ['else']) +
                            this.processNode(node.alternate) :
                                '');

                case 'LabeledStatement':
                    return this.processNode(node.label) +
                        this.csp(node.label.end, node.body.start, ':') +
                        this.processNode(node.body);

                case 'TryStatement':
                    return this.csp(node.start, node.block.start, ['try']) +
                        this.processNode(node.block) +
                        this.csp(node.block.end, node.handler.start) +
                        this.processNode(node.handler) +
                        (node.finalizer ?
                            this.csp(node.handler.end, node.finalizer.start, ['finally']) +
                            this.processNode(node.finalizer)
                            : '');

                case 'WhileStatement':
                    return this.csp(node.start, node.test.start, ['while', '(']) +
                        this.processNode(node.test) +
                        this.csp(node.test.end, node.body.start, ')') +
                        this.processNode(node.body);

                case 'DoWhileStatement':
                    return this.csp(node.start, node.body.start, ['do']) +
                        this.processNode(node.body) +
                        this.csp(node.body.end, node.test.start, ['while', '(']) +
                        this.processNode(node.test) +
                        this.csp(node.test.end, node.end, [')', ';']);

                case 'SwitchStatement':
                    return this.csp(node.start, node.discriminant.start, ['switch', '(']) +
                        this.processNode(node.discriminant) +
                        this.csp(node.discriminant.end, node.cases, [')', '{']) +
                        this.processArray(node.cases) +
                        this.csp(node.cases, node.end, '}');

                case 'ForStatement':
                    return this.csp(node.start, (node.init || node.test || node.update || node.body).start, ['for', '(']) +
                        this.processNode(node.init).replace(/;$/, '') +
                        this.csp((node.init || {}).end || node.start + 4, (node.test || node.update || node.body).start, ';') +
                        this.processNode(node.test) +
                        this.csp((node.test || node.init || {}).end || node.start + 5, (node.update || node.body).start, ';') +
                        this.processNode(node.update) +
                        this.csp((node.update || node.test || node.init || {}).end || node.start + 6, node.body.start, ')') +
                        this.processNode(node.body);
                case 'ForInStatement':
                    return this.csp(node.start, node.left.start, ['for', '(']) +
                        this.processNode(node.left).replace(/;$/, '') +
                        this.csp(node.left.end, node.right.start, [' ', 'in', ' ']) +
                        this.processNode(node.right) +
                        this.csp(node.right.end, node.body.start, ')') +
                        this.processNode(node.body);
                case 'SwitchCase':
                    var prepend;
                    if (node.test) {
                        prepend = this.csp(node.start, node.test.start, ['case', ' ']) +
                            this.processNode(node.test);
                    } else {
                        prepend = 'default';
                    }
                    if (node.consequent.length) {
                        return prepend +
                            this.csp(node.test ? node.test.end : node.start + 7, node.consequent) +
                            this.processArray(node.consequent);
                    } else {
                        return prepend;
                    }
                    break;
                case 'FunctionDeclaration':
                    return this.functionExpression(node);

                case 'VariableDeclaration':
                    return node.kind +
                        this.csp(node.start + node.kind.length, node.declarations, ' ') +
                        this.processArray(node.declarations, ',') +
                        this.csp(node.declarations, node.end, ';');

                case 'VariableDeclarator':
                    if (!node.init) {
                        return this.processNode(node.id);
                    }
                    return this.processNode(node.id) +
                        this.csp(node.id.end, node.init.start, [' ', '=', ' ']) +
                        this.processNode(node.init);

                case 'ThrowStatement':
                    return this.csp(node.start, node.argument.start, ['throw', ' ']) +
                        this.processNode(node.argument) +
                        this.csp(node.argument.end, node.end, ';');

                case 'ReturnStatement':
                    return this.csp(node.start, node.argument.start, ['return', ' ']) +
                        this.processNode(node.argument) +
                        this.csp(node.argument.end, node.end, ';');

                case 'CatchClause':
                    return this.csp(node.start, node.param.start, ['catch', ' ', '(']) +
                        this.processNode(node.param) +
                        this.csp(node.param.end, node.body.start, ')') +
                        this.processNode(node.body);

                case 'ArrayExpression':
                    if (node.elements.length) {
                        return this.csp(node.start, node.elements, '[') +
                            this.processArray(node.elements, ',') +
                            this.csp(node.elements, node.end, ']');
                    } else {
                        return this.csp(node.start, node.end, ['[', ']']);
                    }
                    break;
                case 'AssignmentExpression':
                    return this.processNode(node.left) +
                        this.csp(node.left.end, node.right.start, '=') +
                        this.processNode(node.right);

                case 'BinaryExpression':
                    return this.binaryExpression(node);

                case 'CallExpression':
                    return this.callExpression(node);

                case 'ConditionalExpression':
                    return this.processNode(node.test) +
                        this.csp(node.test.end, node.consequent.start, '?') +
                        this.processNode(node.consequent) +
                        this.csp(node.consequent.end, node.alternate.start, ':') +
                        this.processNode(node.alternate);

                case 'FunctionExpression':
                    return this.functionExpression(node);

                case 'MemberExpression':
                    var left = node.computed ? '[' : '.',
                        right = node.computed ? ']' : '';
                    return this.processNode(node.object) +
                        this.csp(node.object.end, node.property.start, left) +
                        this.processNode(node.property) +
                        this.csp(node.property.end, node.end, right);

                case 'NewExpression':
                    return this.csp(node.start, node.id ? node.id.start : node.start + 4, ['new', ' ']) +
                        this.callExpression(node);

                case 'ThisExpression':
                    return 'this';
                case 'ObjectExpression':
                    if (node.properties.length) {
                        return this.csp(node.start, node.properties, '{') +
                            this.processArray(node.properties, ',') +
                            this.csp(node.properties, node.end, '}');
                    } else {
                        return this.csp(node.start, node.end, ['{', '}']);
                    }
                    break;
                case 'Property':
                    if (node.kind !== 'init') {
                        throw new TypeError('Don\'t know how to build property on kind ' + node.kind);
                    }
                    return this.processNode(node.key) +
                        this.csp(node.key.end, node.value.start, ':') +
                        this.processNode(node.value);

                case 'LogicalExpression':
                    return this.binaryExpression(node);

                case 'UnaryExpression':
                    if (!node.prefix) {
                        throw new TypeError('Don\'t know whaat to do with prefix === false of "' + node.type + '"');
                    }
                    return node.operator +
                        this.csp(node.start + node.operator.length, node.argument.start) +
                        this.processNode(node.argument);

                case 'UpdateExpression':
                    if (node.prefix) {
                        return node.operator +
                            this.csp(node.start + node.operator.length, node.argument.start) +
                            this.processNode(node.argument);
                    } else {
                        return this.processNode(node.argument) +
                            this.csp(node.argument.end, node.end - node.operator.length) +
                            node.operator;
                    }
                    break;
                case 'SequenceExpression':
                    return this.processArray(node.expressions, ',');

                case 'Identifier':
                    return node.name;

                case 'Literal':
                    return node.raw || (typeof node.value === 'string' ? "'" + node.value.replace(/'/, "\\'") + "'" : node.value);
                case 'Program':
                    return this.csp(0, node.start) +
                        this.processArray(node.body) +
                        this.csp(node.end, this.raw.length);

                default:
                    throw new TypeError('Don\'t know how to write type "' + node.type + '"');
            }
        } catch(e) {
            e.message += '\n\tin ' + node.type;
            throw e;
        }
    },
    space: function(start, end) {
        var length = end - start,
            str = '';
        if (length) {
            var str = this.raw.substr(start, length);
        }
        return str.replace(/\S/g, '');
    },
    /**
     * comment - space - punctuator
     */
    csp: function (start, end, punct) {
        var usePunct = !!punct;
        if (start instanceof Array) {
            start = start[start.length - 1] && start[start.length - 1].end;
        }
        if (end instanceof Array) {
            end = end[0] && end[0].start;
        }
        if (!punct) {
            punct = [];
        } else if (!(punct instanceof Array)) {
            punct = [punct];
        }
        if (typeof start !== 'number' || typeof end !== 'number') {
            return punct && punct.join('');
        }
        var str = '';
        if (this.r < start) {
            this.r = start;
        }

        while (this.r < end) {
            while (this.tokens[this.p] && this.tokens[this.p].start < this.r) {
                this.p++;
            }
            while (this.comments[this.c] && this.comments[this.c].start < this.r) {
                this.c++;
            }
            var token = this.tokens[this.p] || {};
            if (token.start === this.r) {
                if (usePunct && !punct.length) {
                    return str;
                }
                var nextindex = 0;
                while (punct[nextindex] && !/\S/.test(punct[nextindex])) {
                    nextindex++;
                }

                if (punct[nextindex] && punct[nextindex] !== token.value) {
                    console.error('Comment-Space-Prunctuator: expected', punct[nextindex], ', seen', token.value);
                    return str + punct.join('bla');
                } else {
                    punct = punct.slice(nextindex + 1);
                }

                str += token.value;
                this.r += token.value.length;
                this.p++;
            } else {
                var comment = this.comments[this.c] || {};
                if (comment.start === this.r) {
                    if (comment.type === 'Block') {
                        str += '/*' + comment.value + '*/';
                        this.r += comment.value.length + 4;
                    } else {
                        str += '//' + comment.value;
                        this.r += comment.value.length + 2;
                    }
                    this.c++;
                } else {
                    if (punct.length && !/\S/g.test(punct[0])) {
                        punct.shift();
                    }
                    str += this.raw[this.r++].replace(/\S/g, '');
                }
            }
        }
        return str + punct.join('WaT');
    },
    processArray: function(nodes, separator) {
        if (!nodes.length) {
            return '';
        }
        separator = separator || '';
        return nodes.map(function(item, i, items) {
            var result = '';
            if (!item) {
                return i ? separator : '';
            }

            if (i) {
                result += this.csp(items[i - 1].end, item.start, separator);
            }
            return result + this.processNode(item);
        }, this).join('');
    }
};