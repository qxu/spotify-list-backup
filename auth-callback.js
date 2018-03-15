window.onload = function () {
    var target = window.self === window.top ? window.opener : window.parent;
    var hash = window.location.hash;
    if (hash) {
        hash = hash.slice(1);
        var params = {};
        var hashSplit = hash.split('&');
        for (var i = 0; i < hashSplit.length; ++i) {
            var paramSplit = hashSplit[i].split('=');
            params[decodeURIComponent(paramSplit[0])] = decodeURIComponent(paramSplit[1]);
        }
        target.postMessage(params, CD_URL);
    }
}
