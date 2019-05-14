var ololoe = 42;
var namee = 'some-name';
views('wtf', '<div>lala' + ololoe + 'erg' +
    '[% wtf  %]' +
'</div>end');


views(namee, '<div>' +
    '<span>' + namee + '</span>' +
'</div>');

views('functmpl', function () {});

views('alalate', function alala() {});


views('add', data => data + data);


views('query-man', function (data, req, execView) {
    return execView('ololoe', data);
});

views('query%man', function () {});

views('42', function () {});