//Global vars

var elementError = new CustomElement("errorMessage");
var successElement = new CustomElement("success_video_show_card");
var spinner = new CustomElement("spinner");
var downloadlink = new CustomElement("download_link");
var download_progress = new CustomElement("download_progress");
var cancelDownload = new CustomElement("cancelDownload");



document.addEventListener('DOMContentLoaded', function() {
    successElement.hideElement();
    elementError.hideElement();
    cancelDownload.hideElement();
    sendMessageToBackground("statusDownloadRequest",{});
});

cancelDownload.element.addEventListener("click",function (e){
    sendMessageToBackground("cancelDownloadRequest",{});
    downloadlink.showElement();
    spinner.hideElement();
    download_progress.hideElement();
    cancelDownload.hideElement();
});

chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {
    if (response.type === "statusDownloadResponse") {
        handleStatusDownloadResponse (response.message);
    }
    else if (response.type === "getMediaResponse") {
        if (response.message.status === "SUCCESS_MEDIAID") {
            handleSuccessMediaResponse (response.message.mediadetails,false);
        }
        else if (response.message.status === "ERROR") {
            handleErrorResponse(response.message.statusText);
        }
    }
    else if (response.type === "startDownloadResponse") {
        handleStartDownloadResponse();
    }
    else if (response.type === "downloadProgressResponse") {
        handleDownloadProgressResponse (response.message);
    }
    else if (response.type === "downloadCompleteResponse") {
        handleDownloadCompleteResponse();
    }
    else if (response.type === "cancelDownloadResponse") {
        handleDownloadCancelResponse();
    }
    else if (response.type === "downloadErrorResponse") {
        handleErrorResponse(response.message.statusText);
    }
    else if (response.type === "ERROR_RESPONSE") {
        handleErrorResponse(response.message.statusText);
    }
});

function getCurrentTabUrl() {
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, function (tabs) {
        var tab = tabs[0];
        var url = tab.url;
        sendMessageToBackground("getMediaRequest",{url : url});
    });
}

function handleStatusDownloadResponse (response) {
    if (response.statusText === "No Downloading") {
        getCurrentTabUrl();
    }
    else if(response.statusText === "Downloading") {
        handleSuccessMediaResponse (response.mediadetails,true);
    }
}

function handleStartDownloadResponse () {
    download_progress.showElement();
    spinner.showElement();
    downloadlink.hideElement();
    cancelDownload.showElement();
}

function handleDownloadProgressResponse (response) {
    download_progress.element.MaterialProgress.setProgress(response.percentage);
}

function handleDownloadCompleteResponse() {
    download_progress.hideElement();
    spinner.hideElement();
    downloadlink.showElement();
    cancelDownload.hideElement();
    getCurrentTabUrl();
}

function handleDownloadCancelResponse() {
    handleDownloadCompleteResponse();
}

function handleSuccessMediaResponse (mediaInfo,isDownloadStarted) {
    elementError.hideElement();
    elementError.showTextContent("");
    successElement.showElement();
    if (!isDownloadStarted) {
        spinner.hideElement();
        download_progress.hideElement();
        downloadlink.showElement();
        cancelDownload.hideElement();
    }
    else {
        downloadlink.hideElement();
        spinner.showElement();
        download_progress.showElement();
        download_progress.element.MaterialProgress.setProgress(mediaInfo.downloaed);
        cancelDownload.showElement();
    }

    var mediaImageElement = new CustomElement("mediaImage");
    var mediaNameElement = new CustomElement("mediaName");
    mediaImageElement.setProperty("src",mediaInfo.pictureURL);
    mediaNameElement.showTextContent(mediaInfo.medianame);
    downloadlink.element.addEventListener("click",function (e){
        sendMessageToBackground("startDownloadRequest",{mediaid : mediaInfo.mediaid});
        downloadlink.hideElement();
        spinner.showElement();
        download_progress.showElement();
    });
}

function handleErrorResponse (errorMessage) {
    elementError.showElement();
    elementError.showTextContent(errorMessage);
    successElement.hideElement();
}

function sendMessageToBackground (type , message) {
    chrome.runtime.sendMessage({ type : type ,message : message});
}
