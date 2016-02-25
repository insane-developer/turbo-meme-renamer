var thisRefs = [],
    removedNames = {};

module.exports = {
    onRvalue: function(node, parent, scope, walker) {
        var value = scope.getValue(node);
        if (value && value.type === 'ThisExpression') {
            if (parent.type === 'VariableDeclarator') {
                walker.remove();
            } else {
                thisRefs.push(node);
                return {
                    type: 'Identifier',
                    name: 'data'
                };
            }
            console.log(node.name, 'is this');
        } else {
            console.log(node.name, 'isn\'t this');
        }

    },
    onFunctionLeave: function(node, parent, scope) {
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