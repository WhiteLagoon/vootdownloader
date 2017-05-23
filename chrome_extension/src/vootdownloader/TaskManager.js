function TaskManager() {
    this.taskURLs = [];
    this.mediaTasks = [];
    this.downloadingTask = [];
    this.retryTask = [];
    this.maxTasks = 1;
    this.srcDownload = ["www.voot.com", "www.hotstar.com"];
    this.mediaStrategy = null;
}

TaskManager.prototype.attatchMediaTaskURL = function(manifesturl, taburl) {
    if (this.downloadingTask.length <= this.maxTasks) {
        //this.taskURLs[mediaid] = manifesturl;
        var t;
        if (taburl.indexOf("www.voot.com")) {
            var t = taburl.split("/");
            t=t[t.length-2];
        } else {
            t = "video" + Math.floor(Math.random() * 999900000);
        }

        var mediaData = {
            MediaID: Math.floor(Math.random() * 999900000),
            MediaName: t,
            Pictures: ["voot_icon.png"],
            URL: manifesturl,
            tabUrl: taburl
        };
        this.addMediaDetails(mediaData);
    } else {
        console.log("max download reached");
    }
}

TaskManager.prototype.updateMediaTaskURL = function(manifesturl) {
    this.retryTask.forEach(function(mediaid) {
        var index = getMediaIndexFromMediaTask.bind(this)(mediaid);
        var taskURL1 = manifesturl.split(".m3u8")[0];
        var taskURL2 = this.mediaTasks[index].masterplaylistURL.split(".m3u8")[0];

        if (taskURL1 === taskURL2) {
            this.mediaTasks[index].masterplaylistURL = manifesturl;
            this.mediaTasks[index].callbacks.onUpdateMediaURLS = onUpdateMediaURLS.bind(this);
            this.retryTask.splice(this.retryTask.indexOf(mediaid), 1);
            this.downloadingTask.push(mediaid);
            clearInterval(this.reloadTimer);
            this.mediaTasks[index].loadMasterPlayList();
        }
    }.bind(this));
}

function onUpdateMediaURLS(mediaid) {
    sendMessageToPopup.bind(this)("showRetryStartedResponse", {
        status: "retry"
    });
    var index = getMediaIndexFromMediaTask.bind(this)(mediaid);
    this.mediaTasks[index].callbacks.onUpdateMediaURLS = null;
    //this.mediaTasks[index].downloadMediaFromServer(true);
    console.log("reload completed please try to reload");
}

TaskManager.prototype.addMediaDetails = function(mediaData) {
    var newMedia = new MediaDetails(mediaData);
    var indexMedia = getMediaIndexFromMediaTaskURL.bind(this)(newMedia.masterplaylistURL);
    if (indexMedia === -1) {
        indexMedia = (this.mediaTasks.push(newMedia)) - 1;
    }
    this.mediaTasks[indexMedia].callbacks.onFullDownloadCompleteMedia = onDownloadCompleteMedia.bind(this);
    this.mediaTasks[indexMedia].callbacks.onDownloadCancelled = onDownloadCanceled.bind(this);
    this.mediaTasks[indexMedia].callbacks.onAnyFragmentLoadError = onAnyFragmentLoadError.bind(this);
    this.mediaTasks[indexMedia].callbacks.sendResponseToExtension = setTextToExtension.bind(this);
    this.mediaTasks[indexMedia].callbacks.sendResponseToPopup = sendMessageToPopup.bind(this);

    this.mediaTasks[indexMedia].loadMasterPlayList();
    sendMessageToPopup.bind(this)("getMediaResponse", {
        status: "SUCCESS_MEDIAID",
        mediadetails: [{
            mediaid: this.mediaTasks[indexMedia].mediaid,
            medianame: this.mediaTasks[indexMedia].medianame,
            pictureURL: this.mediaTasks[indexMedia].pictureURL
        }]
    });
}

TaskManager.prototype.loadSelectedBandwidth = function (mediaid,resolutionid) {
    var index = getMediaIndexFromMediaTask.bind(this)(mediaid);
    sendMessageToPopup.bind(this)("downloadNotAvailableResponse", {
        status: "OK"
    });
    this.mediaTasks[index].loadBandwidthPlayList(resolutionid);
}

TaskManager.prototype.statusCheckMedia = function() {
    var downloadingTasks = [];
    var retryTasks = [];

    this.downloadingTask.forEach(function(mediaid) {
        var media = getMediaFromMediaTask.bind(this)(mediaid);
        downloadingTasks.push({
            mediaid: media.mediaid,
            medianame: media.medianame,
            pictureURL: media.pictureURL,
            downloaded: media.downloaded
        });
    }.bind(this));

    this.retryTask.forEach(function(mediaid) {
        var media = getMediaFromMediaTask.bind(this)(mediaid);
        retryTasks.push({
            mediaid: media.mediaid,
            medianame: media.medianame,
            pictureURL: media.pictureURL,
            downloaded: media.downloaded
        });
    }.bind(this));

    if (retryTasks.length > 0) {
        return sendMessageToPopup.bind(this)("statusDownloadResponse", {
            statusText: "Retrying",
            mediadetails: retryTasks
        });
    } else if (downloadingTasks.length > 0) {
        return sendMessageToPopup.bind(this)("statusDownloadResponse", {
            statusText: "Downloading",
            mediadetails: downloadingTasks
        });
    }
    if (downloadingTasks.length === 0 || retryTasks.length === 0) {
        return sendMessageToPopup.bind(this)("statusDownloadResponse", {
            statusText: "No Downloading"
        });
    }
}

TaskManager.prototype.startDownloadTask = function(mediaid) {
    var mediaContent = getMediaFromMediaTask.bind(this)(mediaid);
    if (mediaContent) {
        var indexMedia = getMediaIndexFromMediaTask.bind(this)(mediaid);
        this.mediaTasks[indexMedia].downloadMediaFromServer();
        this.downloadingTask.push(mediaid);
        return sendMessageToPopup("startDownloadResponse", {
            statusText: "Download Started"
        });
    } else {
        sendMessageToPopup.bind(this)("startDownloadResponse", {
            status: "ERROR",
            statusText: "Invalid Voot Media id"
        });
    }
}

TaskManager.prototype.cancelDownloadTask = function(mediaid) {
    var isDownloadingMedia = this.downloadingTask.indexOf(mediaid) >= 0;
    var isRetryingMedia = this.retryTask.indexOf(mediaid) >= 0;

    if (isDownloadingMedia || isRetryingMedia) {
        var indexMedia = getMediaIndexFromMediaTask.bind(this)(mediaid);
        this.mediaTasks[indexMedia].cancelDownload();
        console.log("download id " + mediaid, this.downloadingTask.indexOf(mediaid));
        this.downloadingTask.splice(this.downloadingTask.indexOf(mediaid), 1);
        this.retryTask.splice(this.retryTask.indexOf(mediaid), 1);

        setTextToExtension.bind(this)("");
        sendMessageToPopup.bind(this)("cancelDownloadResponse", {
            statusText: "Download Canceled"
        });
        setTimeout(function(mediaid) {
            return function() {
                this.mediaTasks.splice(this.mediaTasks.indexOf(mediaid), 1);
            }.bind(this);
        }.bind(this)(mediaid), 2000);
    } else {
        sendMessageToPopup.bind(this)("cancelDownloadResponse", {
            status: "ERROR",
            statusText: "Invalid Voot Media id"
        });
    }
}

function onAnyFragmentLoadError(mediaid) {
    this.downloadingTask.splice(this.downloadingTask.indexOf(mediaid), 1);
    if (this.retryTask.indexOf(mediaid) === -1) {
        this.retryTask.push(mediaid);
    }
    sendMessageToPopup.bind(this)("showRetryWaitResponse", {
        status: "retry"
    });
    var index = getMediaIndexFromMediaTask.bind(this)(mediaid);
    chrome.tabs.create({
        url: this.mediaTasks[index].tabUrl
    });
    this.reloadTimer = setInterval(function(maxRetry, mediaid) {
        return function() {
            if (maxRetry === 0) {
                clearInterval(this.reloadTimer);
                this.cancelDownloadTask(mediaid);
            } else {
                var index = getMediaIndexFromMediaTask.bind(this)(mediaid);
                maxRetry--;
                chrome.tabs.create({
                    url: this.mediaTasks[index].tabUrl
                });
            }
        }.bind(this);
    }.bind(this)(3, mediaid), 20000);
}

function onDownloadCompleteMedia(mediaid) {
    var indexMedia = getMediaIndexFromMediaTask.bind(this)(mediaid);
    this.mediaTasks.splice(indexMedia, 1);
    this.downloadingTask.splice(this.downloadingTask.indexOf(mediaid), 1);
}

function onDownloadCanceled(mediaid) {
    this.cancelDownloadTask(mediaid);
}

function getMediaFromMediaTask(mediaid) {
    var mediaArray = this.mediaTasks.filter(function(x) {
        return x.mediaid === mediaid;
    });
    return mediaArray[0];
}

function getMediaIndexFromMediaTask(mediaid) {
    return this.mediaTasks.map(function(e) {
        return e.mediaid;
    }).indexOf(mediaid);
}

function getMediaIndexFromMediaTaskURL(url) {
    return this.mediaTasks.map(function(e) {
        return e.masterplaylistURL;
    }).indexOf(url);
}



// function loadMediaContentFromMediaid(mediaID) {
//     var loader = new XhrLoader("https://wapi.voot.com/ws/ott/getMediaInfo.json?platform=Web&pId=2&mediaId=" + mediaID, "application/json");
//     loader.callbacks.onSuccess = onSuccessLoad.bind(this);
//     loader.callbacks.onError = onErrorLoad.bind(this);
//     loader.load();
// }

// function onSuccessLoad(mediaData) {
//     var picURL="";
//     if (mediaData.Pictures) {
//         picURL = mediaData.Pictures[mediaData.Pictures.length - 1].URL;
//     }
//     sendMessageToPopup.bind(this)("getMediaResponse", {
//         status: "SUCCESS_MEDIAID",
//         mediadetails: [{
//             mediaid: mediaData.MediaID,
//             medianame: mediaData.MediaName,
//             pictureURL: picURL
//         }]
//     });
//     this.addMediaDetails(mediaData);
// }
//
// function onErrorLoad(error) {
//     return sendMessageToPopup.bind(this)("getMediaResponse", {
//         status: "ERROR",
//         statusText: "Oops.. Error Occured."
//     });
// }

function sendMessageToPopup(type, message) {
    chrome.runtime.sendMessage({
        type: type,
        message: message
    });
}

function setTextToExtension(text) {
    chrome.browserAction.setBadgeText({
        text: text
    })
}