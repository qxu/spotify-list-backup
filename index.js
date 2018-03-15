
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
    var spotifySaveStatusElem = document.getElementById('spotify-save-status');
    var spotifySaveBtn = document.getElementById('spotify-save-btn');

    var fileSaveElem = document.getElementById('file-save');
    var fileSaveBtn = document.getElementById('file-save-btn');

    var spotifyResetElem = document.getElementById('spotify-reset');
    var spotifyResetStatusElem = document.getElementById('spotify-reset-status');
    var spotifyResetBtn = document.getElementById('spotify-reset-btn');

    var dropZoneElem = document.getElementById('drop-zone');

    window.onmessage = function (event) {
        if (event.origin !== CD_URL) {
            return;
        }
        
        authWindow.close();
        
        var auth = event.data;

        function spotifyGet(url, responseCallback) {
            var request = new XMLHttpRequest();
            request.open('GET', url);
            request.setRequestHeader('Authorization', auth['token_type'] + ' ' + auth['access_token']);
            if (responseCallback != null) {
                request.onload = function () {
                    if (request.status == 200) {
                        var response = JSON.parse(request.responseText);
                        responseCallback(response);
                    }
                };
            }
            request.send();
        }

        function spotifyPut(url, data, responseCallback) {
            var request = new XMLHttpRequest();
            window.request = request;
            request.open('PUT', url);
            request.setRequestHeader('Authorization', auth['token_type'] + ' ' + auth['access_token']);
            request.setRequestHeader('Content-Type', 'application/json');
            if (responseCallback != null) {
                request.onload = function () {
                    if (request.status == 200) {
                        responseCallback();
                    }
                };
            }
            request.responseType = 'text';
            request.send(data);
        }

        function spotifyDelete(url, data, responseCallback) {
            var request = new XMLHttpRequest();
            window.request = request;
            request.open('DELETE', url);
            request.setRequestHeader('Authorization', auth['token_type'] + ' ' + auth['access_token']);
            request.setRequestHeader('Content-Type', 'application/json');
            if (responseCallback != null) {
                request.onload = function () {
                    if (request.status == 200) {
                        responseCallback();
                    }
                };
            }
            request.responseType = 'text';
            request.send(data);
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

        spotifyGet('https://api.spotify.com/v1/me', function (response) {
            var userId = response['id'];
            var displayName = response['display_name'];

            var playlists = [];

            function loadSpotifyPlaylists() {
                playlists = [];

                loadStatusElem.textContent = 'Loading ' + userId + ': ' + displayName + '\'s Spotify...';
                loadStatusElem.style.display = '';

                loadSpotifyPlaylistsHelper('https://api.spotify.com/v1/me/playlists?limit=50');
            }

            function loadSpotifyPlaylistsHelper(url) {
                spotifyGet(url, function (response) {
                    for (var i = 0; i < response.items.length; ++i) {
                        playlists.push(response.items[i]);
                    }
                    if (response.next) {
                        loadSpotifyPlaylistsHelper(response.next, callback);
                    } else {
                        window.playlists = playlists;

                        console.log(response);
                        console.log(playlists);

                        loadStatusElem.textContent = 'Loaded from ' + userId + ': ' + displayName + '\'s Spotify.';
                        
                        var playlistsText = JSON.stringify(playlists, null, 4);
                        var playlistsBlob = new Blob([playlistsText], { type : 'application/json' });

                        fileSaveBtn.onclick = savePlaylistsToFile;
                        spotifySaveBtn.onclick = savePlaylistsToSpotify;
                        spotifySaveElem.style.display = '';
                        fileSaveElem.style.display = '';

                        spotifyResetBtn.onclick = function () {
                            if (window.confirm('Are you sure you want to reset your Spotify account? This will remove all tracks and playlists.')) {
                                resetPlaylistsSpotify();
                            }
                        };
                        spotifyResetElem.style.display = '';
                    }
                });
            }

            function savePlaylistsToSpotify() {
                spotifySaveStatusElem.textContent = 0 + '/' + playlists.length;
                if (playlists.length >= 1) {
                    savePlaylistsToSpotifyHelper(playlists.length - 1);
                }
            }

            function savePlaylistsToSpotifyHelper(playlistIndex) {
                var playlist = playlists[playlistIndex];
                if (playlist['type'] === 'playlist') {
                    var jsonData = { 'public': playlist['public'] };
                    var data = JSON.stringify(jsonData);
                    spotifyPut('https://api.spotify.com/v1/users/' + playlist['owner']['id'] + '/playlists/' + playlist['id'] + '/followers', data, function () {
                        spotifySaveStatusElem.textContent = (playlists.length - playlistIndex) + '/' + playlists.length;
                        if (playlistIndex >= 1) {
                            savePlaylistsToSpotifyHelper(playlistIndex - 1);
                        }
                    });
                } else {
                    spotifySaveStatusElem.textContent = (playlists.length - playlistIndex) + '/' + playlists.length;
                    if (playlistIndex >= 1) {
                        savePlaylistsToSpotifyHelper(playlistIndex - 1);
                    }
                }
            }

            function savePlaylistsToFile() {
                saveAs(userId + '.json', playlistsBlob);
            }

            function resetPlaylistsSpotify() {
                spotifyResetStatusElem.textContent = playlists.length + ' remaining';
                if (playlists.length >= 1) {
                    resetPlaylistsSpotifyHelper(0);
                }
            }

            function resetPlaylistsSpotifyHelper(playlistIndex) {
                var playlist = playlists[playlistIndex];
                if (playlist['type'] === 'playlist') {
                    spotifyDelete('https://api.spotify.com/v1/users/' + playlist['owner']['id'] + '/playlists/' + playlist['id'] + '/followers', null, function () {
                        spotifyResetStatusElem.textContent = (playlists.length - playlistIndex - 1) + ' remaining';
                        if (playlistIndex <= playlists.length - 2) {
                            resetPlaylistsSpotifyHelper(playlistIndex + 1);
                        }
                    });
                } else {
                    spotifyResetStatusElem.textContent = (playlists.length - playlistIndex - 1) + ' remaining';
                    if (playlistIndex <= playlists.length - 2) {
                        resetPlaylistsSpotifyHelper(playlistIndex + 1);
                    }
                }
            }

            spotifyAuthStatusElem.textContent = 'Authorized as ' + userId + ': ' + displayName;

            spotifyLoadBtn.onclick = loadSpotifyPlaylists;

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
                    playlists = json;
                    window.playlists = playlists;

                    console.log(file);
                    console.log(playlists);

                    loadStatusElem.textContent = 'Loaded from file ' + file.name +  '.';

                    spotifySaveBtn.onclick = savePlaylistsToSpotify;
                    fileSaveBtn.onclick = savePlaylistsToFile;

                    spotifySaveElem.style.display = '';
                    fileSaveElem.style.display = '';
                };
                reader.readAsText(file);
                loadStatusElem.textContent = 'Loading file ' + file.name + '...';
                loadStatusElem.style.display = '';
                
                spotifyResetElem.style.display = 'none';
            };
        });
    };


    function buildURIParams(params) {
        var s = [];
        for (var param in params) {
            if (params.hasOwnProperty(param)) {
                s.push(encodeURIComponent(param) + '=' + encodeURIComponent(params[param]));
            }
        }
        return s.join('&');
    }

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
