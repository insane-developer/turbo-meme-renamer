var globalWhitelist = require('./globals'),
    walker = require('estraverse'),
    filename = '';

function Identifier(name, old) {
    this.type = 'Identifier';
    if (old) {
        this.start = old.start;
        this.end = old.end;
        this.range = old.range;
    }
    this.name = name;
}

function cleanRemovedVars(ast, removed) {
    return walker.replace(ast, {
        leave: function (node) {
            if (node.type === 'VariableDeclarator' && !node.init && removed[node.id.name]) {
                this.remove();
            }
        }
    });
}

function location(node) {
    return (filename ? 'in ' + filename : '') +
        (node.loc && node.loc.start ? ' at line ' + node.loc.start.line + ', col ' + node.loc.start.column : '');
}
module.exports = {
    setFile: function (file) {
        filename = file;
    },
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
            if (func.property.name === 'views') {
                if (object && object.type === 'ThisExpression') {
                    node.callee = new Identifier('VIEW_NOT_REPLACED', node.callee);
                    execViewRefs.push(node.callee);
                } else {
                    console.warn('Suspicious member looks like view invocation '.yellow + location(node),
                        (object.name || object.type) + '.' + func.property.name);
                }
            }
        }
    },
    onMemberExpression: function (node, parent, scope, walker) {
        var globalRefs = scope.getStored('globalrefs'),
            viewArgs = scope.getStored('viewArgs');
        if (!globalRefs) {
            return;
        }
        var object = node.object;

        if (object.type === 'Identifier' || object.type === 'ThisExpression') {

            object = scope.getValue(object);
            if (globalWhitelist.hasOwnProperty(node.property.name)) {
                if ((object && object.type === 'ThisExpression' && (scope.isView || object.scope && object.scope.isView)) ||
                    (node.object.name && viewArgs.indexOf(node.object.name) === 0)) {
                    node.object = new Identifier('GLOBAL_NOT_REPLACED', node.object);
                    globalRefs.push(node.object);
                } else if (!node.object.name || viewArgs.indexOf(node.object.name) !== 1) {
                    console.warn('Suspicious member looks like global '.yellow + location(node),
                        (node.object.name || node.object.type) + '.' + node.property.name);
                }
            }
        }
    },
    onRvalue: function(node, parent, scope, walker) {
        var thisRefs = scope.getStored('thisrefs'),
            removed = scope.getStored('removed');
        if (!thisRefs) {
            return;
        }

        if (node.type === 'MemberExpression') {
            var objRef = scope.getValue(node.object);
            if (objRef && objRef.type === 'ThisExpression' &&
                node.property.name === 'views') {
             //   console.log(node, 'is execViews');
                walker.remove();
                if (parent.type === 'VariableDeclarator') {
                    removed[parent.id.name] = true;
                }
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
                removed[parent.id.name] = true;
            } else {
                var newNode = node;
                if (node.type !== 'Identifier') {
                    newNode = new Identifier('THIS_NOT_REPLACED', node);
                }
                thisRefs.push(newNode);
                return newNode;
            }
        } else {
        //    console.log(node.name, 'isn\'t this, it is', value);
        }

    },
    onLvalue: function (node, parent, scope) {
        var removed = scope.getStored('removed');
        if (!removed) {
            return;
        }
        removed[node.name] = false;
    },
    onFunctionBody: function(node, parent, scope) {
        if (parent.isViewFunction) {
            scope.isView = true;
            scope.store('thisrefs', []);
            scope.store('globalrefs', []);
            scope.store('execView', []);
            scope.store('localVars', {});
            scope.store('removed', {});
            scope.store('viewArgs', scope.getNames(false));
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
        var varNames = scope.getStored('localVars');

        if (!node.isViewFunction) {
            if (varNames) {
                /* Нужно знать имена всех сущностей любых функций внутри views,
                 * чтобы случайно ничего не сломать при добавлении аргументов
                 */
                scope.getNames(false).forEach(function(name) {
                    varNames[name] = true;
                });
            }
            return;
        }
        scope.getNames().forEach(function(name) {
            varNames[name] = true;
        });

        var firstArgProposals = ['data', 'params', 'ctx', 'dataArg', 'FIXME_no_imagination_local_data'],
            secondArgProposals = ['req', 'request', 'reqData', 'reqArg', 'FIXME_no_imagination_request_data'],
            firstArgName,
            secondArgName,
            thirdArgName = 'execView';
        var thisRefs = scope.getStored('thisrefs') || [],
            globalRefs = scope.getStored('globalrefs') || [],
            execViewRefs = scope.getStored('execView') || [],
            execViewIsUsed = execViewRefs.length || ('execView' in varNames);
        
        if (node.params[0] && node.params[0].name !== 'execView') {
            firstArgName = node.params[0].name;
        } else {
            firstArgProposals.some(function(name) {
                if (!(name in varNames)) {
                    firstArgName = name;
                    return true;
                }
            });
            if (thisRefs.length || globalRefs.length || execViewIsUsed) {
                node.params[0] = new Identifier(firstArgName);
            }
        }

        if (node.params[1]) {
            secondArgName = node.params[1].name;
        } else {
            secondArgProposals.some(function(name) {
                if (!(name in varNames)) {
                    secondArgName = name;
                    return true;
                }
            });

            if (globalRefs.length || execViewIsUsed) {
                node.params[1] = new Identifier(secondArgName);
            }

        }
        if (node.params[2]) {
            thirdArgName = node.params[2].name;
        }

        if (execViewIsUsed) {
            node.params[2] = new Identifier(thirdArgName);
        }

        thisRefs.forEach(function(item) {
            item.name = firstArgName;
        });

        globalRefs.forEach(function(item) {
            item.name = secondArgName;
        });

        execViewRefs.forEach(function(item) {
            item.name = thirdArgName;
        });

        
      //  console.log('func leave');
        return cleanRemovedVars(node, scope.getStored('removed'));
    }
};