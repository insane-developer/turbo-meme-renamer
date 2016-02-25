var walker = require('estraverse');

function Scope(vars, parent) {
    this.vars = {};//Object.create(parent && parent.vars || {});
    this.marks = {};
    this.parent = parent;
    if(parent && parent.vars) {
        for(var name in parent.vars){
            var item = parent.vars[name];
            this.vars[item.name] =  item;
        }
    }
    if(vars) {
        vars.forEach(function(item) {
            this.vars[item.name] = item;
        }, this);
    }
}

Scope.prototype = {
    derive: function(vars) {
        var scope = new Scope(vars, this);
     //   scope.marks = Object.create(this.marks);
        return scope;
    },
    addVar: function(node, value) {
        this.vars[node.name] = node;
        if (value && value.type === 'Identifier') {
            value = this.getValue(value);
        }
        node.value = value;
    },
    getValue: function(srcNode) {
        if (srcNode.type !== 'Identifier') {
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
        if(node) {
            if (value && value.type === 'Identifier') {
                value = this.getValue(value);
            }
            node.value = value;
        }
    },
    mark: function(name, value) {
        this.marks[name] = value;
    },
    getMark: function(name) {
        return this.marks[name];
    },
    getNames: function() {
        var names = [];
        for(var name in this.vars) {
            names.push(name);
        }
        return names;
    }
};

module.exports = function transform(ast, raw, actions) {
    var scope = new Scope(),
        res = walker.replace(ast, {
        enter: function(node, parent) {
            if (node.type === 'CallExpression' &&
                node.callee.type === 'Identifier' &&
                node.callee.name === 'views' &&
                node.arguments.length > 1 &&
                node.arguments[0].type === 'Literal' &&
                node.arguments[1].type === 'FunctionExpression') {
                node.arguments[1].isView = true;
                scope.mark('views', true);
            }
            if (node.type === 'BlockStatement' &&
                /Function(Expression|Declaration)/.test(parent.type)) {
                scope = scope.derive(parent.params);
            } else if (node.type === 'VariableDeclarator') {
                scope.addVar(node.id, node.init);
            } else if (node.type === 'AssignmentExpression') {
                scope.setValue(node.left.name, node.right);
            } else if ((node.type === 'Identifier' || node.type === 'ThisExpression') &&
                !(parent.type === 'MemberExpression' && parent.property === node)) {
                if(!(parent.type === 'VariableDeclarator' && parent.id === node) &&
                    !(parent.type === 'AssignmentExpression' && parent.left === node)) {
                    return scope.getMark('views') && actions.onRvalue && actions.onRvalue(node, parent, scope, this);
                }else {
                    return scope.getMark('views') && actions.onLvalue && actions.onLvalue(node, parent, scope, this);
                }
            } else if(node.type === 'ThisExpression') {
                return scope.getMark('views') && actions.onThis && actions.onThis(node, parent, scope, this);
            } else if (/Function(Expression|Declaration)/.test(node)) {
                return scope.getMark('views') && actions.onFunction && actions.onFunction(node, parent, scope, this);
            }

        },
        leave: function(node, parent) {
            if (node.type === 'CallExpression' &&
                node.callee.type === 'Identifier' &&
                node.callee.name === 'views' &&
                node.arguments.length > 1 &&
                node.arguments[0].type === 'Literal' &&
                node.arguments[1].type === 'FunctionExpression') {
                scope.mark('views', false);
            }
            console.log(node.type, scope);
            if(node.type === 'BlockStatement' &&
                /Function(Expression|Declaretion)/.test(parent.type)) {
                scope = scope.parent;
            } else if(node.type === 'AssignmentExpression' && !node.left) {
                if(parent.type === 'AssignmentExpression' ||
                    parent.type === 'VariableDeclarator' ||
                    parent.type === 'ReturnStatement') {
                    return node.right;
                } else {
                    this.remove();
                }
            } else if(node.type === 'VariableDeclarator' && !node.id) {
                this.remove();
            } else if(node.type === 'VariableDeclaration' && !node.declarations.length) {
                this.remove();
            } else if (/Function(Expression|Declaration)/.test(node.type)) {
                console.log('funcc');
                return node.isView && actions.onFunctionLeave && actions.onFunctionLeave(node, parent, scope, this);
            }
        }
    });
    
    console.log('transform done!');
    return res;
};