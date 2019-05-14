/* eslint-env es6 */
/**
 * ast-transform
 * ==
 * Обёртка над estraverse, позволяющая получать значения переменных в области видимости текущего узла ast
 *
 * **Опции**
 *
 * * *Object* **ast** — исходное ast дерево, полученное с помощью esprima
 * * *Object* **actions** — Объект с методами-действиями, которые исполняются когда walker доходит до узла соответствующего типа
 *
 */
var walker = require('estraverse');

/**
 * Класс, реализующий области видимости
 *
 * @class      Scope (name)
 * @param      {Array} vars   Переменные, которые следует сразу добавить в эту область видимости
 * @param      {Scope}  parent  Родительнская область видимости
 */
function Scope(vars, parent) {
    this.vars = Object.create(parent && parent.vars || {});
    this.store = parent ? Object.create(parent.store) : {};
    this.parent = parent;
    this.args = [];
    if (vars) {
        vars.forEach(item => {
            this.vars[item.name] = item;
            this.args.push(item.name);
        });
    }
}

Scope.prototype = {
    derive: function(argVars) {
        var scope = new Scope(argVars, this);
        return scope;
    },
    addVar: function(node, value) {
        this.vars[node.name] = node;
        this.setValue(node.name, value);
    },
    getValue: function(srcNode) {
        if (!srcNode || srcNode.type !== 'Identifier' || srcNode.name === 'undefined') {
            return srcNode;
        }
        var node = this.vars[srcNode.name];
        if (!node) {
            return srcNode;
        }
        while (node && node.value && typeof node.value === 'object') {
            node = node.value;
            if (node.name && this.vars[node.name]) {
                node = this.vars[node.name];
            }
        }

        return node;
    },
    setValue: function(name, value) {
        var node = this.vars[name];
        if (node && value) {
            while (value.type === 'AssignmentExpression') {
                value = value.right;
            }

            if (value.type === 'Identifier' && value.name !== 'arguments') {
                value = this.getValue(value);
            }
            if (!value) {
                throw new TypeError(`invalid value of ${name}`);
            }
            value.scope = this;
            node.value = value;
        }
    },
    store: function(name, value) {
        this.store[name] = value;
    },
    getStored: function(name) {
        return this.store[name];
    },
    getNames: function(allChain) {
        var names = [];
        for (var name in this.vars) {
            if (this.vars.hasOwnProperty(name) || allChain !== false) {
                names.push(name);
            }
        }
        return names;
    }
};

/**
 * Корректная вычистка удалённых ветвей ast.
 *
 * @param      {Object}  ast     The ast
 */
function cleanup(ast) {
    return walker.replace(ast, {
        leave: function(node, parent) {
            switch (node.type) {
                case 'AssignmentExpression':
                    if (!node.left) {
                        if (parent.type === 'AssignmentExpression' ||
                            parent.type === 'VariableDeclarator' ||
                            parent.type === 'ReturnStatement') {
                            return node.right;
                        } else {
                            this.remove();
                        }
                    }
                    break;
                case 'VariableDeclarator':
                    if (!node.id) {
                        this.remove();
                    }
                    break;
                case 'VariableDeclaration':
                    if (!node.declarations.length) {
                        this.remove();
                    }
                    break;
                case 'ExpressionStatement':
                    if (!node.expression) {
                        this.remove();
                    }
                    break;
                case 'ConditionalExpression':
                    if (node.test.type === 'Identifier' &&
                        node.consequent.type === 'Identifier' &&
                        node.test.name === node.consequent.name) {
                        return {
                            type: 'LogicalExpression',
                            left: node.consequent,
                            operator: '||',
                            right: node.alternate
                        };
                    }
            }
        }
    });
}

module.exports = function transform(ast, parentScope, actions) {
    if (ast.file && actions.setFile) {
        actions.setFile(ast.file);
    }
    var scope = new Scope([], parentScope),
        identifyLRvalue = function(node, parent, walker) {
            if (!(parent.type === 'MemberExpression' && parent.property === node)) {
                if ((parent.type === 'VariableDeclarator' && parent.id === node) ||
                    (parent.type === 'AssignmentExpression' && parent.left === node)) {
                    return actions.onLvalue && actions.onLvalue(node, parent, scope, walker);
                } else {
                    return actions.onRvalue && actions.onRvalue(node, parent, scope, walker);
                }
            }
        },
        res = walker.replace(ast, {
            enter: function(node, parent) {
                switch (node.type){
                    case 'CallExpression':
                        node = actions.onCallExpression && actions.onCallExpression(node, parent, scope, this) || node;
                        break;
                    case 'BlockStatement':
                        if (/Function(Expression|Declaration)/.test(parent.type)) {
                            scope = scope.derive(parent.params);
                            node = actions.onFunctionBody && actions.onFunctionBody(node, parent, scope, this) || node;
                        }
                        break;
                    case 'VariableDeclarator':
                        scope.addVar(node.id, node.init);
                        break;
                    case 'AssignmentExpression':
                        scope.setValue(node.left.name, node.right);
                        break;
                    case 'ThisExpression':
                        node = actions.onThis && actions.onThis(node, parent, scope, this) || node;
                        node = identifyLRvalue(node, parent, this) || node;
                        break;
                    case 'MemberExpression':
                        node = actions.onMemberExpression && actions.onMemberExpression(node, parent, scope, this) || node;
                        node = identifyLRvalue(node, parent, this) || node;
                        break;
                    case 'Identifier':
                        node = identifyLRvalue(node, parent, this) || node;
                        break;
                    case 'FunctionExpression':
                        /* falls through */
                    case 'FunctionDeclaration':
                        if (node.id) {
                            scope.addVar(node.id, node);
                        }
                        node = actions.onFunction && actions.onFunction(node, parent, scope, this) || node;
                        break;
                }
                return node;
            },
            leave: function(node, parent) {
                var returnValue;
                switch (node.type) {
                    case 'Program':
                        returnvalue = actions.onProgramLeave && actions.onProgramLeave(node, parent, scope, this);
                        cleanup(returnValue);
                        break;

                    case 'CallExpression':
                        returnValue = actions.onCallExpressionLeave && actions.onCallExpressionLeave(node, parent, scope, this);
                        cleanup(returnValue);
                        break;
                    case 'ExpressionStatement':
                        cleanup(node);
                        break;
                    case 'BlockStatement':
                        if (/Function(Expression|Declaration)/.test(parent.type)) {
                        }
                        break;
                    case 'AssignmentExpression':
                        if (!node.left) {
                            if (parent.type === 'AssignmentExpression' ||
                                parent.type === 'VariableDeclarator' ||
                                parent.type === 'ReturnStatement') {
                                returnValue = node.right;
                            } else {
                                this.remove();
                            }
                        }
                        break;
                    case 'VariableDeclarator':
                        if (!node.id) {
                            this.remove();
                        }
                        break;
                    case 'VariableDeclaration':
                        if (!node.declarations.length) {
                            this.remove();
                        }
                        break;
                    case 'FunctionExpression':
                        /* falls through */
                    case 'FunctionDeclaration':
                        returnValue = actions.onFunctionLeave && actions.onFunctionLeave(node, parent, scope, this);

                        cleanup(returnValue);
                        scope = scope.parent;
                }
                return returnValue;
            }
        });

    return res;
};