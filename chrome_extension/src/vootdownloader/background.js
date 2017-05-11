var currentMedia = null;
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "statusDownloadRequest") {
        onStatusCheckForCurrentMedia();
    } else if (request.type === "getMediaRequest") {
        parseURI(request.message.url, function(type, message) {
            sendMessageToPopup(type, message);
        });
    } else if (request.type === "startDownloadRequest") {
        onStartDownloadRequest(request.message);
    } else if (request.type === "cancelDownloadRequest") {
        onCancelDownloadRequest ();
    }
});

function parseURI(url, callback) {
    var urlParse = (url.split("/"));
    if (urlParse[2] !== "www.voot.com")
        return callback("getMediaResponse", {
            status: "ERROR",
            statusText: "Invalid url ... Please visit www.voot.com"
        });
    try {
        if (isNaN(parseInt(urlParse[urlParse.length - 1])))
            throw new Error();
        var mediaId = parseInt(urlParse[urlParse.length - 1]);
        return onSuccessMediaID(mediaId, callback);
    } catch (e) {
        console.log(e);
        return callback("getMediaResponse", {
            status: "ERROR",
            statusText: "No videos available"
        });
    }
}

function onStatusCheckForCurrentMedia() {
    if (!currentMedia) {
        return sendMessageToPopup("statusDownloadResponse", {
            statusText: "No Downloading"
        });
    }

    if (currentMedia.isDownloadStarted === false) {
        return sendMessageToPopup("statusDownloadResponse", {
            statusText: "No Downloading"
        });
    } else {
        return sendMessageToPopup("statusDownloadResponse", {
            statusText: "Downloading",
            mediadetails: {
                mediaid: currentMedia.mediaid,
                medianame: currentMedia.medianame,
                pictureURL: currentMedia.pictureURL,
                downloaded : currentMedia.downloaded
            }
        });
    }
}

function onSuccessMediaID(mediaID, callback) {
    var loader = new XhrLoader("https://wapi.voot.com/ws/ott/getMediaInfo.json?platform=Web&pId=2&mediaId=" + mediaID, "application/json");
    loader.callbacks.onSuccess = function(mediaData) {
        mediaData = JSON.parse(mediaData).assets;
        callback("getMediaResponse", {
            status: "SUCCESS_MEDIAID",
            mediadetails: {
                mediaid: mediaData.MediaID,
                medianame: mediaData.MediaName,
                pictureURL: mediaData.Pictures[mediaData.Pictures.length - 1].URL
            }
        })
        onSuccessMediaResponse(mediaData);
    };
    loader.callbacks.onError = function(e) {
        return callback("getMediaResponse", {
            status: "ERROR",
            statusText: "Oops.. Error Occured."
        });
    };
    loader.load();
}

function onStartDownloadRequest (media) {
    if (currentMedia && currentMedia.mediaid === media.mediaid) {
        currentMedia.downloadMediaFromServer();
        return sendMessageToPopup("startDownloadResponse", {
            statusText: "Download Started"
        });
    }
}

function onCancelDownloadRequest () {
    currentMedia.cancelDownload();
    return sendMessageToPopup("cancelDownloadResponse", {
        statusText: "Download Canceled"
    });
}

function onSuccessMediaResponse(mediaData) {
    currentMedia = new MediaDetails(mediaData);
    currentMedia.loadMasterPlayList();
}

function sendMessageToPopup(type, message) {
    chrome.runtime.sendMessage({
        type: type,
        message: message
    });
}
function setTextToExtension (text) {
    chrome.browserAction.setBadgeText({text: text})
}