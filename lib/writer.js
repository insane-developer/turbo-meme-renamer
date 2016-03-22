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
        this.file = options.file || '';

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
            label = this.middle(node.start + name.length, node.label.start, ' ') +
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
            curOp = this.opPrecedence(node),
            middleTokens = [];
        if (this.opPrecedence(node.left) < curOp) {
            left = this.left(node.start, node.left.start, '(') + left;
            middleTokens.push(')');
        }

        middleTokens.push(' ', node.operator, ' ');

        if (this.opPrecedence(node.right) < curOp) {
            middleTokens.push('(');
            right = right + this.right(node.right.end, node.end, ')');
        }
        return left + this.middle(node.left.end, node.right.start, middleTokens) + right;
    },
    callExpression: function(node) {
        var callee = this.processNode(node.callee),
            args = '';

        if (/^Function/.test(node.callee.type)) {
            callee = '(' + callee + ')';
        }

        if (node.arguments.length) {
            args = this.middle(node.callee.end, node.arguments, '(') +
                this.processArray(node.arguments, [',', ' ']) +
                this.right(node.arguments, node.end, ')');
        } else {
            args = this.right(node.callee.end, node.end, ['(', ')']);
        }
        return callee + args;
    },
    functionExpression: function (node) {
        var str = 'function';
        if (node.id) {
            str += this.left(node.start + 8, node.id.start, ' ') +
                this.processNode(node.id);
        }

        if (node.params.length) {
            str += this.middle(node.id ? node.id.end : node.start + 8, node.params, '(') +
                this.processArray(node.params, [',', ' ']) +
                this.right(node.params, node.body.start, [')', ' ']);
        } else {
            str += this.middle(node.id ? node.id.end : node.start + 8, node.body.start, ['(', ')', ' ']);
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
                        this.right(node.expression.end, node.end, ';');

                case 'EmptyStatement':
                    return this.middle(node.start, node.end, ';');

                case 'BlockStatement':
                    if (node.body.length) {
                        return this.left(node.start, node.body, '{') +
                            this.processArray(node.body, ['\n']) +
                            this.right(node.body, node.end, '}');
                    } else {
                        return this.middle(node.start, node.end, ['{', '}']);
                    }
                    break;
                case 'BreakStatement':
                    return this.wordWithLabelStatement('break', node);

                case 'ContinueStatement':
                    return this.wordWithLabelStatement('continue', node);

                case 'IfStatement':
                    return this.left(node.start, node.test.start, ['if', '(']) +
                        this.processNode(node.test) +
                        this.right(node.test.end, node.consequent.start, ')') +
                        this.processNode(node.consequent) +
                        (node.alternate ?
                            this.middle(node.consequent.end, node.alternate.start, ['else']) +
                            this.processNode(node.alternate) :
                                '');

                case 'LabeledStatement':
                    return this.processNode(node.label) +
                        this.middle(node.label.end, node.body.start, ':') +
                        this.processNode(node.body);

                case 'TryStatement':
                    return this.left(node.start, node.block.start, ['try']) +
                        this.processNode(node.block) +
                        this.middle(node.block.end, node.handler.start, '') +
                        this.processNode(node.handler) +
                        (node.finalizer ?
                            this.middle(node.handler.end, node.finalizer.start, ['finally']) +
                            this.processNode(node.finalizer)
                            : '');

                case 'WhileStatement':
                    return this.left(node.start, node.test.start, ['while', '(']) +
                        this.processNode(node.test) +
                        this.middle(node.test.end, node.body.start, ')') +
                        this.processNode(node.body);

                case 'DoWhileStatement':
                    return this.left(node.start, node.body.start, ['do']) +
                        this.processNode(node.body) +
                        this.middle(node.body.end, node.test.start, ['while', '(']) +
                        this.processNode(node.test) +
                        this.right(node.test.end, node.end, [')', ';']);

                case 'SwitchStatement':
                    return this.left(node.start, node.discriminant.start, ['switch', '(']) +
                        this.processNode(node.discriminant) +
                        this.middle(node.discriminant.end, node.cases, [')', '{']) +
                        this.processArray(node.cases) +
                        this.right(node.cases, node.end, '}');

                case 'ForStatement':
                    return this.right(node.start, (node.init || node.test || node.update || node.body).start, ['for', '(']) +
                        this.processNode(node.init).replace(/;$/, '') +
                        this.right((node.init || {}).end || node.start + 4, (node.test || node.update || node.body).start, ';') +
                        this.processNode(node.test) +
                        this.right((node.test || node.init || {}).end || node.start + 5, (node.update || node.body).start, ';') +
                        this.processNode(node.update) +
                        this.left((node.update || node.test || node.init || {}).end || node.start + 6, node.body.start, ')') + 
                        this.processNode(node.body);
                case 'ForInStatement':
                    return this.left(node.start, node.left.start, ['for', '(']) +
                        this.processNode(node.left).replace(/;$/, '') +
                        this.middle(node.left.end, node.right.start, [' ', 'in', ' ']) +
                        this.processNode(node.right) +
                        this.right(node.right.end, node.body.start, ')') +
                        this.processNode(node.body);
                case 'SwitchCase':
                    var prepend;
                    if (node.test) {
                        prepend = this.left(node.start, node.test.start, ['case', ' ']) +
                            this.processNode(node.test);
                    } else {
                        prepend = 'default';
                    }
                    if (node.consequent.length) {
                        return prepend +
                            this.middle(node.test ? node.test.end : node.start + 7, node.consequent, ':') +
                            this.processArray(node.consequent);
                    } else {
                        return prepend + this.right(node.test ? node.test.end : node.start + 7, node.end, ':');
                    }
                    break;
                case 'FunctionDeclaration':
                    return this.functionExpression(node);

                case 'VariableDeclaration':
                    return node.kind +
                        this.middle(node.start + node.kind.length, node.declarations, ' ') +
                        this.processArray(node.declarations, ',') +
                        this.right(node.declarations, node.end, ';');

                case 'VariableDeclarator':
                    if (!node.init) {
                        return this.processNode(node.id);
                    }

                    return this.processNode(node.id) +
                        this.middle(node.id.end, node.init.start, [' ', '=', ' ']) +
                        this.processNode(node.init);

                case 'ThrowStatement':
                    return this.left(node.start, node.argument.start, ['throw', ' ']) +
                        this.processNode(node.argument) +
                        this.right(node.argument.end, node.end, ';');

                case 'ReturnStatement':
                    if (node.argument) {
                    return this.left(node.start, node.argument.start, ['return', ' ']) +
                        this.processNode(node.argument) +
                        this.right(node.argument.end, node.end, ';');
                    } else {
                        return this.middle(node.start, node.end, ['return', ';']);
                    }

                case 'CatchClause':
                    return this.left(node.start, node.param.start, ['catch', ' ', '(']) +
                        this.processNode(node.param) +
                        this.right(node.param.end, node.body.start, ')') +
                        this.processNode(node.body);

                case 'ArrayExpression':
                    if (node.elements.length) {
                        return this.left(node.start, node.elements, '[') +
                            this.processArray(node.elements, ',') +
                            this.right(node.elements, node.end, ']');
                    } else {
                        return this.middle(node.start, node.end, ['[', ']']);
                    }
                    break;
                case 'AssignmentExpression':
                    return this.processNode(node.left) +
                        this.middle(node.left.end, node.right.start, [' ', node.operator, ' ']) +
                        this.processNode(node.right);

                case 'BinaryExpression':
                    return this.binaryExpression(node);

                case 'CallExpression':
                    return this.callExpression(node);

                case 'ConditionalExpression':
                    return this.processNode(node.test) +
                        this.middle(node.test.end, node.consequent.start, '?') +
                        this.processNode(node.consequent) +
                        this.middle(node.consequent.end, node.alternate.start, ':') +
                        this.processNode(node.alternate);

                case 'FunctionExpression':
                    return this.functionExpression(node);

                case 'MemberExpression':
                    var objPrecedence = this.opPrecedence(node.object),
                        nodePrecedence = this.opPrecedence(node),
                        left = node.computed ? '[' : '.',
                        right = node.computed ? ']' : '',
                        str = '';
                    if (objPrecedence < nodePrecedence ||
                        node.object.type === 'FunctionExpression' ||
                        node.object.type === 'ObjectExpression') {
                        str = this.left(node.start, node.object.start, '(') +
                        this.processNode(node.object) +
                        this.middle(node.object.end, node.property.start, [')', left]);
                    } else {
                        str = this.processNode(node.object) +
                            this.middle(node.object.end, node.property.start, left);
                    }
                    return str +
                        this.processNode(node.property) +
                        this.right(node.property.end, node.end, right, false);

                case 'NewExpression':
                    return this.left(node.start, node.id ? node.id.start : node.start + 4, ['new', ' ']) +
                        this.callExpression(node);

                case 'ThisExpression':
                    return 'this';
                case 'ObjectExpression':
                    if (node.properties.length) {
                        return this.left(node.start, node.properties, '{') +
                            this.processArray(node.properties, ',') +
                            this.right(node.properties, node.end, '}');
                    } else {
                        return this.middle(node.start, node.end, ['{', '}']);
                    }
                    break;
                case 'Property':
                    if (node.kind !== 'init') {
                        throw new TypeError('Don\'t know how to build property on kind ' + node.kind);
                    }
                    return this.processNode(node.key) +
                        this.middle(node.key.end, node.value.start, ':') +
                        this.processNode(node.value);

                case 'LogicalExpression':
                    return this.binaryExpression(node);

                case 'UnaryExpression':
                    if (!node.prefix) {
                        throw new TypeError('Don\'t know whaat to do with prefix === false of "' + node.type + '"');
                    }
                    return node.operator +
                        this.middle(node.start + node.operator.length, node.argument.start) +
                        this.processNode(node.argument) +
                        this.right(node.argument.end, node.end);

                case 'UpdateExpression':
                    if (node.prefix) {
                        return node.operator +
                            this.middle(node.start + node.operator.length, node.argument.start) +
                            this.processNode(node.argument);
                    } else {
                        return this.processNode(node.argument) +
                            this.middle(node.argument.end, node.end - node.operator.length) +
                            node.operator;
                    }
                    break;
                case 'SequenceExpression':
                    return this.processArray(node.expressions, ',');

                case 'Identifier':
                    return node.name;

                case 'Literal':
                    return (node.raw || (typeof node.value === 'string' ? "'" + node.value.replace(/'/, "\\'") + "'" : node.value));
                case 'Program':
                    return this.left(0, node.start) +
                        this.processArray(node.body) +
                        this.right(node.end, this.raw.length);

                default:
                    throw new TypeError('Don\'t know how to write type "' + node.type + '"');
            }
        } catch(e) {
            e.message += '\n\tin ' + node.type;
            throw e;
        }
    },
    /**
     * Пробелы, пунктуация и комментарии между от сущностями.
     * при обнаружении разрыва он будет проигнорирован.
     */
    middle: function(start, end, punct, weak) {
        var params = this._normalizeBounds(start, end, punct, weak),
            current = params.start;
        end = params.end;
        if (!punct) {
            weak = true;
        }
        punct = params.punct;

        if (typeof start !== 'number' || typeof end !== 'number') {
            return punct && punct.join('');
        }
        var tIndex = 0,
            cIndex = 0,
            str = '';
        while (current < end) {
            var part = this._iterateBetween(current, end, tIndex, cIndex, params.weak ? false : punct);
            str += part.str;
            tIndex = part.tIndex;
            cIndex = part.cIndex;
            current = part.next;
        }
        if (!str) {
            /* Если вообще ни чего не нашлось - просто возвращаем дефолт */
            return punct.join('');
        }
        for (var i = punct.length - 1; i >= 0; i--) {
            if (/\S/.test(punct[i]) && str.indexOf(punct[i]) === -1) {
                /* если в полученной строке нет необходимых символов - их надо добавить. */
                str = punct[i] + str;
            }
        }

        return str;
    },
    /**
     * Пробелы, пунктуация и комментарии слева от сущности.
     * при обнаружении разрыва будет отброшено все ДО разрыва.
     */
    left: function(start, end, punct, weak) {
        var params = this._normalizeBounds(start, end, punct, weak);
        start = params.start;
        end = params.end;
        if (!punct) {
            weak = true;
        }
        punct = params.punct;

        if (typeof start !== 'number' || typeof end !== 'number') {
            return punct && punct.join('');
        }
        var current = start,
            tIndex = 0,
            cIndex = 0,
            str = '';
        while (current < end) {
            var part = this._iterateBetween(current, end, tIndex, cIndex, params.weak ? false : punct);
            str = part.str;
            tIndex = part.tIndex;
            cIndex = part.cIndex;
            current = part.next;
        }
        if (!str) {
            /* Если вообще ни чего не нашлось - просто возвращаем дефолт */
            return punct.join('');
        }
        for (var i = 0; i < punct.length; i++) {
            if (/\S/.test(punct[i]) && str.indexOf(punct[i]) === -1) {
                /* если в полученной строке нет необходимых символов - их надо добавить. */
                str += punct[i];
            }
        }

        return str;
    },
    /**
     * Пробелы, пунктуация и комментарии справа от сущности.
     * при обнаружении разрыва будет отброшено все ПОСЛЕ разрыва.
     */
    right: function(start, end, punct, weak) {
        var params = this._normalizeBounds(start, end, punct, weak);
        start = params.start;
        end = params.end;
        punct = params.punct;

        if (typeof start !== 'number' || typeof end !== 'number') {
            return punct && punct.join('');
        }
        var part = this._iterateBetween(start, end, 0, 0, params.weak ? false : punct),
            str = part.str;
        if (!str) {
            /* Если вообще ни чего не нашлось - просто возвращаем дефолт */
            return punct.join('');
        }
        for (var i = punct.length - 1; i >= 0; i--) {
            if (/\S/.test(punct[i]) && str.indexOf(punct[i]) === -1) {
                /* если в полученной строке нет необходимых символов - их надо добавить. */
                str = punct[i] + str;
            }
        }

        return str;
    },
    _normalizeBounds: function (start, end, punct, weak) {
        if (start instanceof Array) {
            start = start[start.length - 1] && start[start.length - 1].end;
        }
        if (end instanceof Array) {
            end = end[0] && end[0].start;
        }
        if (punct === '') {
            punct = [];
        } else if (!punct) {
            weak = true;
            punct = [];
        } else if (!(punct instanceof Array)) {
            punct = [punct];
        }
        return {
            start: start,
            end: end,
            punct: punct,
            weak: weak
        };
    },
    _iterateBetween: function (start, end, tIndex, cIndex, whitelist) {
         var current = start,
            str = '',
            blacklist = {};
        while(current < end) {
            while (tIndex < this.tokens.length &&
                this.tokens[tIndex].start < current) {
                tIndex++;
            }
    
            while (cIndex < this.comments.length &&
                this.comments[cIndex].start < current) {
                cIndex++;
            }
    
            var token = this.tokens[tIndex] || {},
                comment = this.comments[cIndex] || {},
                whtspc = (this.raw[current] || '').replace(/\S/, '');
            if (token.start === current &&
                (!whitelist || !blacklist[token.value] && whitelist.indexOf(token.value) !== -1)) {
                if (whitelist) {
                    blacklist[token.value] = true;
                }
                str += token.value;
                current += token.value.length;
            } else if (comment.start === current) {
                if (comment.type === 'Block') {
                    str += '/*' + comment.value + '*/';
                    current += comment.value.length + 4;
                } else {
                    str += '//' + comment.value;
                    current += comment.value.length + 2;
                }
            } else if (whtspc) {
                str += whtspc;
                current += whtspc.length;
            } else {
                return {
                    str: str,
                    next: current + 1,
                    tIndex: tIndex,
                    cIndex: cIndex
                };
            }
        }
        return {
            str: str,
            current: current,
            tIndex: tIndex,
            cIndex: cIndex
        };
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
                result += this.right(items[i - 1].end, item.start, separator, false);
            }
            return result + this.processNode(item);
        }, this).join('');
    }
};