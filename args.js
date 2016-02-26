var globalWhitelist = require('./globals');

module.exports = {
    onCallExpression: function(node, parent, scope) {
        var execViewRefs = scope.getStored('execView');
        if (!execViewRefs) {
            return;
        }
        var func = node.callee;
        if (func.type === 'Identifier') {
            func = scope.getValue(node.callee);
        }
        if (func && func.type === 'MemberExpression') {
            var object = scope.getValue(func.object);
            if (object && object.type === 'ThisExpression' &&
                func.property.name === 'views') {
                console.log(node.callee, 'is execView');
                node.callee = {
                    type: 'Identifier',
                    name: 'VIEW_NOT_REPLACED'
                };
                execViewRefs.push(node.callee);
            } else {
                console.log(node.callee, 'isn\'t execView');
            }
        }
    },
    onMemberExpression: function (node, parent, scope, walker) {
       var globalRefs = scope.getStored('globalrefs');
        if (!globalRefs) {
            return;
        }
        var object = node.object;
        console.log(node, 'is global?');
        if (object.type === 'Identifier' || object.type === 'ThisExpression') {
            object = scope.getValue(object);
            if(!object) {
                console.log('wtf is', node);
            }
            if (object.type === 'ThisExpression' && (scope.isView || object.scope && object.scope.isView) &&
                node.property.name in globalWhitelist) {
                console.log(node, 'is global');
                node.object = {
                    type: 'Identifier',
                    name: 'GLOBAL_NOT_REPLACED'
                };
                globalRefs.push(node.object);
            }
        }
    },
    onRvalue: function(node, parent, scope, walker) {
        var thisRefs = scope.getStored('thisrefs');
        if (!thisRefs) {
            return;
        }

        if (node.type === 'MemberExpression') {
            var objRef = scope.getValue(node.object);
            if (objRef && objRef.type === 'ThisExpression' &&
                node.property.name === 'views') {
             //   console.log(node, 'is execViews');
                walker.remove();
            }
            return;
        }

        if (node.type === 'ThisExpression' && !scope.isView) {
            /* this во вложенных функциях не то же самое, что и this во view */
         //   console.log(node, '!view this');
            return;
        }

        var value = scope.getValue(node);
        if (value && value.type === 'ThisExpression') {
         //   console.log(node.name || value.type , 'is this');
            if (parent.type === 'VariableDeclarator') {
                walker.remove();
            } else {
                var newNode = node;
                if (node.type !== 'Identifier') {
                    newNode = {
                        type: 'Identifier',
                        name: 'XXX_NOT_REPLACED'
                    };
                }
                thisRefs.push(newNode);
                return newNode;
            }
        } else {
        //    console.log(node.name, 'isn\'t this, it is', value);
        }

    },
    onFunctionBody: function(node, parent, scope) {
        if (parent.isViewFunction) {
            scope.isView = true;
            scope.store('thisrefs', []);
            scope.store('globalrefs', []);
            scope.store('execView', []);
        }
    },
    onFunction: function(node, parent) {
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
            secondArgProposals = ['req', 'request', 'reqData', 'reqArg', 'FIXME_no_imagination_request_data'],
            firstArgName,
            secondArgName,
            thirdArgName = 'execView';

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

        var thisRefs = scope.getStored('thisrefs') || [];
        thisRefs.forEach(function(item) {
            item.name = firstArgName;
        });
        
        var globalRefs = scope.getStored('globalrefs') || [];
        globalRefs.forEach(function(item) {
            item.name = secondArgName;
        });

        var execViewRefs = scope.getStored('execView') || [],
            execViewIsUsed = execViewRefs.length || varNames.indexOf('execView') !== -1;
        execViewRefs.forEach(function(item) {
            item.name = thirdArgName;
        });
        node.params = [];

        if (thisRefs.length || globalRefs.length || execViewIsUsed) {
            node.params.push({
                type: 'Identifier',
                name: firstArgName
            });
        }

        if (globalRefs.length || execViewIsUsed) {
            node.params.push({
                type: 'Identifier',
                name: secondArgName
            });
        }

        if (execViewIsUsed) {
            node.params.push({
                type: 'Identifier',
                name: thirdArgName
            });
        }

        console.log('func leave');
        return node;
    }
};