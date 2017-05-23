var currentMedia = null;
var taskManager = new TaskManager();
var map_tab_task = {};
var map_tab_tasktimer = {};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "statusDownloadRequest") {
        if (map_tab_tasktimer[request.message.tabid]) {
            clearInterval(map_tab_tasktimer[tabid]);
            map_tab_tasktimer[tabid] = null;
        }
        taskManager.statusCheckMedia();
    } else if (request.type === "getMediaRequest") {
        if (parseTabUrl(request.message.taburl)) {
            if (map_tab_task[request.message.tabid]) {
                if (map_tab_tasktimer[request.message.tabid]) {
                    clearInterval(map_tab_tasktimer[request.message.tabid]);
                    map_tab_tasktimer[request.message.tabid] = null;
                }
                taskManager.attatchMediaTaskURL(map_tab_task[request.message.tabid],request.message.taburl);
            } else {
                if (!map_tab_tasktimer[request.message.tabid]) {
                    map_tab_tasktimer[request.message.tabid] = setInterval(timerForStatusCheck(20, request.message.tabid), 2000)
                }
            }
        }
    } else if (request.type === "startDownloadRequest") {
        taskManager.startDownloadTask(request.message.mediaid);
    } else if (request.type === "cancelDownloadRequest") {
        taskManager.cancelDownloadTask(request.message.mediaid);
    } else if (request.type === "resolutionRequest") {
        taskManager.loadSelectedBandwidth(request.message.mediaid,request.message.resolutionid);
    }
});

function parseTabUrl(url) {
    if (url.indexOf("www.hotstar.com") >= 0 || url.indexOf("www.voot.com") >= 0 || url.indexOf("www.dailymotion.com")>=0 ) {
        return true;
    } else {
        sendMessageToPopup.bind(this)("getMediaResponse", {
            status: "ERROR",
            statusText: "Please visit www.hotstar.com/www.voot.com/www.dailymotion.com"
        });
        return false;
    }
}

function timerForStatusCheck(maxRetry, tabid) {
    return function() {
        if (maxRetry === 0) {
            clearInterval(map_tab_tasktimer[tabid]);
            map_tab_tasktimer[tabid] = null;
            sendMessageToPopup.bind(this)("getMediaResponse", {
                status: "ERROR",
                statusText: "No video available. Please reload website"
            });
        } else {
            maxRetry--;
            if (map_tab_task[tabid]) {
                clearInterval(map_tab_tasktimer[tabid]);
                map_tab_tasktimer[tabid] = null;
            }
            taskManager.statusCheckMedia();
        }
    }
}

// network sniffer
chrome.webRequest.onCompleted.addListener(function(responseDetails) {
    var responseURLParseList = responseDetails.url.split("/");
    var regex;
    var isFoundM3u8 = responseURLParseList.filter(function(str) {
        return str.match(/^[\w]+.m3u8/)
    })
    if (isFoundM3u8.length > 0) {
        if (responseDetails.tabId !== -1) {
            loadResponseURL(responseDetails.url, responseDetails.tabId);
        }
    }
}, {
    urls: ["<all_urls>"]
});

function loadResponseURL(url, tabid) {
    var loader = new XhrLoader(url, "*/*");
    loader.callbacks.onSuccess = parseResponse(url, tabid).bind(this);
    loader.callbacks.onError = function(e) {};
    loader.load();
}

function parseResponse(url, tabid) {
    return function(manifest_master) {
        var parseMasterdManifest = parsePlaylist(manifest_master);
        if (parseMasterdManifest && parseMasterdManifest.playlists) {
            this.map_tab_task[tabid] = url;
            this.taskManager.updateMediaTaskURL(url);
        }
    }
}

function parsePlaylist(manifest) {
    var manifestParser = new m3u8Parser.Parser();
    manifestParser.push(manifest);
    manifestParser.end();

    return manifestParser.manifest;
}