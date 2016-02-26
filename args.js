var thisRefs = [],
    removedNames = {};

module.exports = {
    onRvalue: function(node, parent, scope, walker) {
        var thisRefs = scope.getStored('thisrefs');
        if (!thisRefs) {
            return;
        }
        if (node.type === 'ThisExpression' && !scope.isView) {
            console.log(node, '!view this');
            return;
        }
        var value = scope.getValue(node);
        if (value && value.type === 'ThisExpression') {
            console.log(node.name || value.type , 'is this');
            if (parent.type === 'VariableDeclarator') {
                walker.remove();
            } else {
                var newNode = node;
                if(node.type !== 'Identifier') {
                    newNode = {
                        type: 'Identifier',
                        name: 'XXX_NOT_REPLACED'
                    };
                }
                thisRefs.push(newNode);
                return newNode;
            }
        } else {
            console.log(node.name, 'isn\'t this');
        }

    },
    onFunctionBody: function(node, parent, scope) {
        if (parent.isViewFunction) {
            scope.isView = true;
            scope.store('thisrefs', []);
        }
    },
    onFunction: function(node, parent, scope) {
        if (node.type === 'FunctionExpression' &&
            parent.type === 'CallExpression' &&
            parent.callee.type === 'Identifier' &&
            parent.callee.name === 'views' &&
            parent.arguments.length > 1 &&
            parent.arguments[0].type === 'Literal' &&
            parent.arguments[1] === node) {
            node.isViewFunction = true;
        }
    },
    onFunctionLeave: function(node, parent, scope) {
        if (!node.isViewFunction) {
            return;
        }
        var varNames = scope.getNames(),
            firstArgProposals = ['data', 'params', 'ctx', 'dataArg', 'FIXME_no_imagination_local_data'],
            secondArgProposals = ['req', 'request', 'reqData','reqArg', 'FIXME_no_imagination_request_data'],
            firstArgName,
            secondArgName;
        firstArgProposals.some(function(name) {
            if (varNames.indexOf(name) === -1) {
                firstArgName = name;
                return true;
            }
        });

        secondArgProposals.some(function(name) {
            if (varNames.indexOf(name) === -1) {
                secondArgName = name;
                return true;
            }
        });

        var thisRefs = scope.getStored('thisrefs');
        thisRefs && thisRefs.forEach(function(item) {
            item.name = firstArgName;
        });

        node.params = [
            {
                type: 'Identifier',
                name: firstArgName
            },
            {
                type: 'Identifier',
                name: secondArgName
            },
            {
                type: 'Identifier',
                name: 'execView'
            }
        ];
        console.log('func leave');
        return node;
    }
}