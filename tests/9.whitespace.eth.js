/* literals */
1;
1.45;
2e-45;
true;
false;
null;
undefined;
'hello world';
"hello world";
"don't \"know\"";
'don\'t "know"';
[1, 2, 3];
/* var declaration */
var a = 1;
var b = true,
    object = {
        good: true,
        reason: undefined
    },
    c = function() {};
object.x = 11;
for (var i = 0; i < 10; i ++) ;
for (var key in object) ;
/* functions */
function bla(){}
function blabla(param) {}
function blablable(param, param2) {}
function blablable   (param, param2)  {
    return {
        x: true
    };
}
(function invokeMe(global) {
    if (!global.batman) {
        throw new Evil();
    }
    return global.state;
})(this);

(function invoke() {
    ;
})();

var x = function (param) {},
    y = function bla(param1, param2) {
    return 0 + arguments.length;
};
x = y('x', 'y');
/* loops */
do {
    ;
} while (false);
do    {}    while (false)  ;

while(false) {}
while(false){};
while (false){  ;  }
useless: while(false){
    continue useless;
}
for (var i = 0;;){}
for(a = 0;;){}
for (;;)    {}
for (var i = 0; i < 0; i++) {}
for (a = 0; a < 10; a++)
    ;
for(var key in object)
    ;
/* conditionals */
if (a >= b) a = b;
if (b < c) { ; } else 42;
if (b > c) {
    b++;
}else{  }
if (qwer && !(bla || ble)) {
    console.log('Q');
}
if (!(browser && (browser.isMobile || browser.isTablet))) {
    bla();
}
!(browser && (browser.isMobile || browser.isTablet));
b = a ? e : t;
b = a? e:t;
b = a?e:t;
b = w || (a = x);
switch(true) {
    case true:
        b = 42; // great value!
        break;
    case a === 4 | 5:
        b = 41;

    case 'lba':
    case 'vase':
        s = 4;
    default:
        b = 0;

}
/* try */
try {
    endThisMess();
}catch(qwe){}
try{endThisMess();}catch(qwe){;}

function world() {
    try {
        toBeGood();
    } catch (evil) {
        delete evil.root;
    } finally {
        return new Hope();
    }
    return;
}
/* operator precedence */
a = (2 + 5) * (3 - 2);
b = 2 + 5 * 3 - 2;
c = 2 * 5 + 3 * 2;
d = 2 * 5 + 3;
e = 2 + 5 * 3;
s = 5 + 4 + 3 + 2;
h = 'hello' + 23 + 3;
b = 'bye' + (23 + 3);

var str = 'bal' +
    'lab' + (true ? 'qwe' : 'ewq');
//arrayExpression
[].map();
// literal
'dfgd'.map();
// identifier
bla.map();
// ThisExpression
this.map();
// CallExpression
a().map();
// memberExpression
a.b.map();

// FunctionExpression
(function(){}).bla();
// ObjectExpression
({fg: 1}).bla();
// BinaryExpression
(fghdf+ fgh).map;
// logicalExpression
(fg && x).map();
// UpdateExpression
(++dh).rty;
// NewExpression
new Date().time();
// UnaryExpression
(typeof []).join()
//SequenceExpression
(a = 5, b).map();
// AssignmentExpression
(a = b).map();

/* operators */
var greatIdea = think() && think() &&
    eat() && think() &&
    sleep() || die();
/* end */
// really this is the end