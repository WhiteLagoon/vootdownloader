function MediaDetails (content) {
    this.mediaid = content.MediaID;
    this.medianame = content.MediaName;
    this.masterplaylistURL = content.URL;
    this.playlists = null;
    if (content.tabUrl) {
        this.tabUrl = content.tabUrl;
    }
    if (content.Pictures) {
        this.pictureURL = content.Pictures[content.Pictures.length - 1];
    };
    this.videoSegments = null;
    this.fragmentManager = null;
    this.keyMethod = null;
    this.baseSegmentURI = null;
    this.defaultKeyUri = null;
    this.isDownloadStarted = false;
    this.callbacks = {
        sendResponseToPopup : null,
        sendResponseToExtension : null,
        onFullDownloadCompleteMedia : null,
        onDownloadCancelled : null,
        onUpdateMediaURLS : null,
        onAnyFragmentLoadError : null
    };
}


// request loading
MediaDetails.prototype.loadMasterPlayList = function() {
    var loader = new XhrLoader(this.masterplaylistURL, "*/*");
    loader.callbacks.onSuccess = parseMasterPlaylist.bind(this);
    loader.callbacks.onError = onMediaError("Media playlist loading error").bind(this);
    loader.load();
}

MediaDetails.prototype.loadBandwidthPlayList = function(selectedBandWidth) {
    var playlist_uri = this.playlists[selectedBandWidth].uri;
    var loader = new XhrLoader(playlist_uri);
    loader.callbacks.onSuccess = parseLevelPlaylist.bind(this);
    loader.callbacks.onError = onMediaError("Bandwidth level playlist loading error").bind(this);
    loader.load();
}

MediaDetails.prototype.loadDecryptionKey = function() {
    console.log("loading key content");
    var loader = new XhrLoader(this.defaultKeyUri, "arraybuffer");
    loader.callbacks.onSuccess = onKeyLoadCompleted.bind(this);
    loader.callbacks.onError = onMediaError("Encryption key loading error").bind(this);
    loader.load();
}

MediaDetails.prototype.downloadMediaFromServer = function (retry) {
    if (typeof retry === "undefined") {
        this.fragmentManager = new FragmentsManager(this.videoSegments);
        this.fragmentManager.callbacks.onDownloadComplete = onDownloadComplete.bind(this);
        this.fragmentManager.callbacks.onDownloadProgress = onDownloadProgress.bind(this);
        this.fragmentManager.callbacks.onDownloadError = onDownloadError.bind(this);
        this.fragmentManager.callbacks.onFragmentErrorLoad = onFragmentErrorLoad.bind(this);

        this.fragmentManager.startLoadFragments();
        this.isDownloadStarted = true;
        console.log("Dowload started");
        if (this.callbacks.sendResponseToExtension) {
            this.callbacks.sendResponseToExtension(0 + "%");;
        }
    } else {
        this.fragmentManager.status = "";
        this.fragmentManager.startLoadFragments();
    }
}

MediaDetails.prototype.cancelDownload = function () {
    this.fragmentManager.status = "cancel";
    this.isDownloadStarted=false;
    this.fragmentManager.cancelCurrentFragment();
}

// success responses
function parseMasterPlaylist(manifest_master) {
    var parseMasterdManifest = parsePlaylist(manifest_master);

    this.playlists = parseMasterdManifest.playlists;
    console.log(this.playlists);
    // default playlist having higest bandwidth
    if (this.tabUrl.indexOf("www.dailymotion.com")>=0) {
        var uu = this.playlists[this.playlists.length - 1].uri;
        var u1= uu.split("/");
        u1.splice(3,u1.length-3);
        var uri = u1.join("/");
        this.baseSegmentURI = uri;
    } else {
        this.baseSegmentURI = removeLastContentFromUrl(this.playlists[this.playlists.length - 3].uri);
    }

    this.resolutions = [];
    parseMasterdManifest.playlists.forEach(function (playlist) {
        if (playlist.attributes && playlist.attributes.RESOLUTION) {
            if (playlist.attributes.RESOLUTION.width < 1080)
                this.resolutions.push(playlist.attributes.RESOLUTION.width + "X" + playlist.attributes.RESOLUTION.height);
        }
    }.bind(this));

    if (this.callbacks.sendResponseToPopup) {
        this.callbacks.sendResponseToPopup ("resolutionResponse",{statusText : "resolution",resolution : this.resolutions});
    }
    this.loadBandwidthPlayList(this.resolutions.length - 1); // default last playlist uri having highest bandwidth
}

function parseLevelPlaylist(playlist_manifest) {
    var parseLevelManifest = parsePlaylist(playlist_manifest);
    var segments = parseLevelManifest.segments;
    this.videoSegments = [];
    var segmentKeys = [];
    segments.forEach(function(segment, index) {
        if (segment.key) {
            if (!this.keyMethod) {
                this.keyMethod = segment.key.method;
            }
            var foundDecrypt = findFromArray(segment.key.uri, segmentKeys);
            if (foundDecrypt)
                segmentKeys.push({
                    uri: segment.key.uri,
                    segment_id: index
                });
        }

        if (isURL(segment.uri)) {
            this.videoSegments.push(new Fragment("", segment.uri, index));
        } else {
            if (this.tabUrl.indexOf("www.dailymotion.com")>=0) {
                this.videoSegments.push(new Fragment(this.baseSegmentURI , segment.uri, index));
            } else {
                this.videoSegments.push(new Fragment(this.baseSegmentURI + "/", segment.uri, index));
            }
        }
    }.bind(this));

    if (segmentKeys.length === 0) {
        console.log("segments not encrypted");
    } else if (segmentKeys.length === 1) {
        if (isURL(segmentKeys[0].uri)) {
            this.defaultKeyUri = segmentKeys[0].uri;
        } else {
            this.defaultKeyUri = this.baseSegmentURI + "/" + segmentKeys[0].uri;
        }
        this.loadDecryptionKey();
    }
    if (this.callbacks.onUpdateMediaURLS) {
        var onRetryDownload = this.callbacks.onUpdateMediaURLS;
        onRetryDownload(this.mediaid);
    } else {
        sendMessageToPopup.bind(this)("downloadAvailableResponse", {
            status: "OK"
        });
    }
}

function onKeyLoadCompleted(keyContent) {
    var key = new Uint8Array(keyContent);
    this.videoSegments.forEach(function(segment) {
        segment.addKeyToSegment(key, this.keyMethod);
    }.bind(this));
}

function onDownloadComplete (mergedContent) {
    this.fragmentManager = null;
    var element = document.createElement("a");
    var url = URL.createObjectURL(mergedContent);
    element.setAttribute("href", url);
    element.setAttribute("download", this.medianame + ".ts");
    document.body.appendChild(element);
    element.click();
    URL.revokeObjectURL(url);
    delete a;
    this.isDownloadStarted = false;
    if (this.callbacks.onFullDownloadCompleteMedia) {
        this.callbacks.onFullDownloadCompleteMedia(this.mediaid);
    }
    if (this.callbacks.sendResponseToPopup) {
        this.callbacks.sendResponseToPopup ("downloadCompleteResponse",{statusText : "Download completed"});
    }
    if (this.callbacks.sendResponseToExtension) {
        this.callbacks.sendResponseToExtension("");
    }
}

function onDownloadProgress (noOfSegDownloaed) {
    this.downloaded = Math.round((noOfSegDownloaed / this.fragmentManager.fragments.length) * 100,0)
    //console.log(((noOfSegDownloaed / this.fragmentManager.fragments.length)) * 100 + "% download completed");
    if(this.fragmentManager.status === "cancel") {
        if (this.callbacks.sendResponseToExtension) {
            return this.callbacks.sendResponseToExtension("");
        }
    }

    if (this.callbacks.sendResponseToExtension) {
        this.callbacks.sendResponseToExtension(this.downloaded + "%");;
    }

    if (this.callbacks.sendResponseToPopup) {
        this.callbacks.sendResponseToPopup("downloadProgressResponse",{percentage : this.downloaded});
    }
}

function onFragmentErrorLoad(details) {
    if (this.callbacks.onAnyFragmentLoadError) {
        var onAnyFragmentLoadError = this.callbacks.onAnyFragmentLoadError;
        onAnyFragmentLoadError(this.mediaid);
    }
}

function onDownloadError (error) {
    this.isDownloadStarted = false;
    if (this.callbacks.onDownloadCancelled) {
        this.callbacks.onDownloadCancelled (this.mediaid);
    }
    if (this.callbacks.sendResponseToPopup) {
        this.callbacks.sendResponseToPopup("downloadErrorResponse",{statusText : "Oops Error occured. Please reload website"});
    }
    if (this.callbacks.sendResponseToExtension) {
        this.callbacks.sendResponseToExtension ("");
    }
}

// error responses
function onMediaError (errorMessage) {
    return function (event) {
        console.log(errorMessage);
        if (this.callbacks.sendResponseToPopup) {
            this.callbacks.sendResponseToPopup("ERROR_RESPONSE",{statusText : "Oops Error occured. Please reload website"});
        }
        if (this.callbacks.sendResponseToExtension) {
            this.callbacks.sendResponseToExtension("");
        }
    }
}


// utils functions
function findFromArray(content, array) {
    var element = array.filter(function(x) {
        return x.uri === content;
    })[0];
    return (typeof element === "undefined");
}

function parsePlaylist(manifest) {
    var manifestParser = new m3u8Parser.Parser();
    manifestParser.push(manifest);

    manifestParser.end();
    console.log(manifestParser.manifest);
    return manifestParser.manifest;
}

function removeLastContentFromUrl(url) {
    var url1 = url.split("/");
    url1.pop();
    return url1.join("/");
}

function isURL(url) {
    var regex = new RegExp("(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})");

    if (url.match(regex)) {
        return true;
    } else {
        return false;
    }
}