var walker = require('estraverse');

function Scope(vars, parent) {
    this.vars = {};//Object.create(parent && parent.vars || {});
    this.storeContainer = {};
    this.parent = parent;
    if (parent && parent.vars) {
        for (var name in parent.vars) {
            var item = parent.vars[name];
            this.vars[item.name] = item;
        }
    }
    if (vars) {
        vars.forEach(function(item) {
            this.vars[item.name] = item;
        }, this);
    }
}

Scope.prototype = {
    derive: function(vars) {
        var scope = new Scope(vars, this);
        scope.storeContainer = Object.create(this.storeContainer);
        return scope;
    },
    addVar: function(node, value) {
        this.vars[node.name] = node;
        this.setValue(node.name, value);
    },
    getValue: function(srcNode) {
        if (!srcNode || srcNode.type !== 'Identifier') {
            return srcNode;
        }
        var node = this.vars[srcNode.name];
        while (node && node.value) {
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
                console.log(name, 'assign');
                value = value.right;
            }
            console.log(name, '=', value);
            if (value.type === 'Identifier') {
                value = this.getValue(value);
            }
            node.value = value;
        }
    },
    store: function(name, value) {
        this.store[name] = value;
    },
    getStored: function(name) {
        return this.store[name];
    },
    getNames: function() {
        var names = [];
        for (var name in this.vars) {
            names.push(name);
        }
        return names;
    }
};

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

module.exports = function transform(ast, raw, actions) {
    var scope = new Scope(),
        res = walker.replace(ast, {
        enter: function(node, parent) {
            var returnValue;
            switch (node.type){
                case 'CallExpression':
                    returnValue = actions.onCallExpression && actions.onCallExpression(node, parent, scope, this);
                    break;
                case 'BlockStatement':
                    if (/Function(Expression|Declaration)/.test(parent.type)) {
                        scope = scope.derive(parent.params);
                        returnValue = actions.onFunctionBody && actions.onFunctionBody(node, parent, scope, this);
                    }
                    break;
                case 'VariableDeclarator':
                    scope.addVar(node.id, node.init);
                    break;
                case 'AssignmentExpression':
                    scope.setValue(node.left.name, node.right);
                    break;
                case 'ThisExpression':
                    returnValue = actions.onThis && actions.onThis(node, parent, scope, this);
                    /* falls through */
                case 'MemberExpression':
                case 'Identifier':
                    if (!(parent.type === 'MemberExpression' && parent.property === node)) {
                        if ((parent.type === 'VariableDeclarator' && parent.id === node) ||
                            (parent.type === 'AssignmentExpression' && parent.left === node)) {
                            returnValue = actions.onLvalue && actions.onLvalue(node, parent, scope, this);
                        } else {
                            returnValue = actions.onRvalue && actions.onRvalue(node, parent, scope, this);
                        }
                    }
                    break;
                case 'FunctionExpression':
                    /* falls through */
                case 'FunctionDeclaration':
                    returnValue = actions.onFunction && actions.onFunction(node, parent, scope, this);
                    break;
            }
            return returnValue;
        },
        leave: function(node, parent) {
            var returnValue;
            switch (node.type) {
                case 'CallExpression':
                    if (node.callee.type === 'Identifier' &&
                        node.callee.name === 'views' &&
                        node.arguments.length > 1 &&
                        node.arguments[0].type === 'Literal' &&
                        node.arguments[1].type === 'FunctionExpression') {

                    }
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
    
    console.log('transform done!');
    return res;
};