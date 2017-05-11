
function MediaDetails(content) {
    this.mediaid = content.MediaID;
    this.medianame = content.MediaName;
    this.masterplaylistURL = content.URL;
    this.playlists = null;
    this.pictureURL = content.Pictures[content.Pictures.length - 1].URL;
    this.videoSegments = null;
    this.fragmentManager = null;
    this.keyMethod = null;
    this.baseSegmentURI = null;
    this.defaultKeyUri = null;
    this.isDownloadStarted = false;
}


// request loading
MediaDetails.prototype.loadMasterPlayList = function() {
    var loader = new XhrLoader(this.masterplaylistURL, "*/*");
    loader.callbacks.onSuccess = parseMasterPlaylist.bind(this);
    loader.callbacks.onError = onMediaError("Media playlist loading error").bind(this);
    loader.load();
}

MediaDetails.prototype.loadBandwidthPlayList = function(selectedBandWidth) {
    var playlist_uri = this.playlists[selectedBandWidth - 1].uri;
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

MediaDetails.prototype.downloadMediaFromServer = function () {
    this.fragmentManager = new FragmentsManager(this.videoSegments);
    this.fragmentManager.callbacks.onDownloadComplete = onDownloadComplete.bind(this);
    this.fragmentManager.callbacks.onDownloadProgress = onDownloadProgress.bind(this);
    this.fragmentManager.callbacks.onDownloadError = onDownloadError.bind(this);

    this.fragmentManager.startLoadFragments();
    this.isDownloadStarted = true;
    console.log("Dowload started");
}

MediaDetails.prototype.cancelDownload = function () {
    this.fragmentManager.status = "cancel";
    this.isDownloadStarted=false;
}

// success responses
function parseMasterPlaylist(manifest_master) {
    var parseMasterdManifest = parsePlaylist(manifest_master);

    this.playlists = parseMasterdManifest.playlists;
    // default playlist having higest bandwidth
    this.baseSegmentURI = removeLastContentFromUrl(this.playlists[this.playlists.length - 1].uri);
    this.loadBandwidthPlayList(this.playlists.length - 1); // default last playlist uri having highest bandwidth
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
        this.videoSegments.push(new Fragment(this.baseSegmentURI, segment.uri, index));
    }.bind(this));

    if (segmentKeys.length === 0) {
        console.log("segments not encrypted");
    } else if (segmentKeys.length === 1) {
        this.defaultKeyUri = this.baseSegmentURI + "/" + segmentKeys[0].uri;
        this.loadDecryptionKey();
    }
}

function onKeyLoadCompleted(keyContent) {
    var key = new Uint8Array(keyContent);
    this.videoSegments.forEach(function(segment) {
        segment.addKeyToSegment(key, this.keyMethod);
    }.bind(this));
}

function onDownloadComplete (mergedContent) {
    var element = document.createElement("a");
    var blob = new Blob(mergedContent);
    var url = URL.createObjectURL(blob);
    element.setAttribute("href", url);
    element.setAttribute("download", this.medianame + ".ts");
    element.click();
    URL.revokeObjectURL(url);
    this.isDownloadStarted = false;
    sendMessageToPopup("downloadCompleteResponse",{statusText : "Download completed"});
    setTextToExtension("");
}

function onDownloadProgress (noOfSegDownloaed) {
    this.downloaded = Math.round((noOfSegDownloaed / this.fragmentManager.fragments.length) * 100,0)
    console.log(((noOfSegDownloaed / this.fragmentManager.fragments.length)) * 100 + "% download completed");
    setTextToExtension(this.downloaded + "%");
    if(this.fragmentManager.status === "cancel") {
        return setTextToExtension("");
    }
    sendMessageToPopup("downloadProgressResponse",{percentage : this.downloaded});
}

function onDownloadError (error) {
    this.isDownloadStarted = false;
    sendMessageToPopup("downloadErrorResponse",{statusText : "Oops.. Error occured.."});
}

// error responses
function onMediaError (errorMessage) {
    return function (event) {
        console.log(errorMessage);
        sendMessageToPopup("ERROR_RESPONSE",{statusText : "Oops.. Error occured.."});
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

    return manifestParser.manifest;
}

function removeLastContentFromUrl(url) {
    var url1 = url.split("/");
    url1.pop();
    return url1.join("/");
}