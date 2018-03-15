
function buildURIParams(params) {
    var s = [];
    for (var param in params) {
        if (params.hasOwnProperty(param)) {
            s.push(encodeURIComponent(param) + '=' + encodeURIComponent(params[param]));
        }
    }
    return s.join('&');
}

function spotifyGet(url, auth, responseCallback) {
    var request = new XMLHttpRequest();
    request.open('GET', url);
    request.setRequestHeader('Authorization', auth['token_type'] + ' ' + auth['access_token']);
    request.onload = function () {
        if (request.status == 200) {
            var response = JSON.parse(request.responseText);
            responseCallback(response);
        }
    };
    request.send();
}

function spotifyPut(url, auth, data) {
    var request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('Authorization', auth['token_type'] + ' ' + auth['access_token']);
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(data);
}

function spotifyGetPlaylists(url, auth, playlistsCallback) {
    spotifyGetPlaylistsHelper(url, auth, [], playlistsCallback);
}

function spotifyGetPlaylistsHelper(url, auth, playlists, playlistsCallback) {
    spotifyGet(url, auth, function (response) {
        for (var i = 0; i < response.items.length; ++i) {
            playlists.push(response.items[i]);
        }
        if (response.next) {
            spotifyGetPlaylistsHelper(response.next, auth, playlists, callback);
        } else {
            playlistsCallback(playlists);
        }
    });
}

function saveTextAs(fileName, text) {
    var elem = document.createElement('a');
    elem.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    elem.download = fileName;
    var event = new MouseEvent("click");
    elem.dispatchEvent(event);
}

function saveAs(fileName, blob) {
    var elem = document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.download = fileName;
    var event = new MouseEvent("click");
    elem.dispatchEvent(event);
}

window.onload = function () {
    var authWindow;

    var spotifyAuthStatusElem = document.getElementById('spotify-auth-status');

    var spotifyLoadElem = document.getElementById('spotify-load');
    var spotifyLoadPlaylistTracksChkbox = document.getElementById('spotify-load-playlist-tracks-chkbox');
    var spotifyLoadBtn = document.getElementById('spotify-load-btn');

    var fileLoadElem = document.getElementById('file-load');
    var fileLoadBtn = document.getElementById('file-load-btn');

    var loadStatusElem = document.getElementById('load-status');

    var spotifySaveElem = document.getElementById('spotify-save');
    var spotifySaveBtn = document.getElementById('spotify-save-btn');

    var fileSaveElem = document.getElementById('file-save');
    var fileSaveBtn = document.getElementById('file-save-btn');

    var dropZoneElem = document.getElementById('drop-zone');

    window.onmessage = function (event) {
        if (event.origin !== CD_URL) {
            return;
        }
        
        authWindow.close();
        
        var auth = event.data;

        spotifyGet('https://api.spotify.com/v1/me', auth, function (response) {
            var userId = response['id'];
            var displayName = response['display_name'];

            spotifyAuthStatusElem.textContent = 'Authorized as ' + userId + ': ' + displayName;

            spotifyLoadBtn.onclick = function () {
                var playlists = [];
                spotifyGetPlaylists('https://api.spotify.com/v1/me/playlists?limit=50', auth, function (playlists) {
                    window.playlists = playlists;
                    loadStatusElem.textContent = 'Loaded from ' + userId + ': ' + displayName + '\'s Spotify.';
                    spotifySaveElem.style.display = '';
                    var playlistsText = JSON.stringify(playlists, null, 4);
                    var playlistsBlob = new Blob([playlistsText], { type : 'application/json' });
                    fileSaveBtn.onclick = function () {
                        saveAs(userId + '.json', playlistsBlob);
                    };
                    fileSaveElem.style.display = '';
                });

                loadStatusElem.textContent = 'Loading ' + userId + ': ' + displayName + '\'s Spotify...';
                loadStatusElem.style.display = '';
            };
        });

        fileLoadBtn.onclick = function () {

        };

        spotifyLoadElem.style.display = '';
        fileLoadElem.style.display = '';
        
        window.ondragenter = function (event) {
            dropZoneElem.style.visibility = 'visible';
        };

        dropZoneElem.ondragexit = function (event) {
            dropZoneElem.style.visibility = 'hidden';
        };

        dropZoneElem.ondragover = function (event) {
            event.preventDefault();
        };

        dropZoneElem.ondrop = function (event) {
            event.preventDefault();
            dropZoneElem.style.visibility = 'hidden';
            
            var file = event.dataTransfer.files[0];
            var reader = new FileReader();
            reader.onload = function (event) {
                var json = JSON.parse(event.target.result);
                var playlists = json;
                window.playlists = playlists;

                spotifySaveBtn.onclick = function () {
                    for (var i = 0; i < playlists.length; ++i) {
                        var playlist = playlists[i];
                        var jsonData = { 'public': playlist['public'] };
                        var data = JSON.stringify(jsonData);
                        spotifyPut('https://api.spotify.com/v1/users/' + playlist['owner']['id'] + '/playlists/' + playlist['id'] + '/followers', auth, data);
                    }
                };

                loadStatusElem.textContent = 'Loaded from file ' + file.name +  '.';

                spotifySaveElem.style.display = '';
                fileSaveElem.style.display = '';
            };
            reader.readAsText(file);
            loadStatusElem.textContent = 'Loading file ' + file.name + '...';
            loadStatusElem.style.display = '';
        };
    };

    document.getElementById('spotify-auth-btn').onclick = function () {
        var authorizeQueryParams = {
            'client_id': SPOTIFY_CLIENT_ID,
            'response_type': 'token',
            'redirect_uri': CD_URL + '/auth-callback.html',
            'scope': 'playlist-read-private playlist-modify-public playlist-modify-private',
            'show_dialog': 'true'
        };

        var width = 480;
        var height = 640;
        var left = (window.screen.width - width) / 2;
        var top = (window.screen.height - height) / 2;

        authWindow = window.open('https://accounts.spotify.com/authorize?' + buildURIParams(authorizeQueryParams), 'spotify-auth-window', 'menubar=no,location=no,scrollbars=no,status=no,width=' + width + ',height=' + height + ',top=' + top + ',left=' + left);
    };
}
