//Global vars
var elementError = new CustomElement("errorMessage");
var successElement = new CustomElement("success_video_show_card");
var spinner = new CustomElement("spinner");
var downloadlink = new CustomElement("download_link");
var download_progress = new CustomElement("download_progress");
var cancelDownload = new CustomElement("cancelDownload");
var load_spinner = new CustomElement("load_spinner");
var load_message = new CustomElement("load_message");
var wait_button = new CustomElement("wait_button");
var resolution_box = new CustomElement("resolution");

var currentMediaID = null;

document.addEventListener('DOMContentLoaded', function() {
    successElement.hideElement();
    elementError.hideElement();
    cancelDownload.hideElement();
    load_spinner.showElement();
    load_message.showElement();
    wait_button.hideElement();
    sendMessageToBackground("statusDownloadRequest", {});
});

cancelDownload.element.addEventListener("click", function(e) {
    sendMessageToBackground("cancelDownloadRequest", {
        mediaid: currentMediaID
    });
    downloadlink.showElement();
    spinner.hideElement();
    download_progress.hideElement();
    cancelDownload.hideElement();
});

chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {
    console.log(response.type);
    if (response.type === "statusDownloadResponse") {
        handleStatusDownloadResponse(response.message);
    } else if (response.type === "getMediaResponse") {
        if (response.message.status === "SUCCESS_MEDIAID") {
            handleSuccessMediaResponse(response.message.mediadetails[0], false);
        } else if (response.message.status === "ERROR") {
            handleErrorResponse(response.message.statusText);
        }
    } else if (response.type === "downloadAvailableResponse") {
        downloadlink.showElement();
        wait_button.hideElement();
    } else if (response.type === "startDownloadResponse") {
        handleStartDownloadResponse();
    } else if (response.type === "downloadProgressResponse") {
        handleDownloadProgressResponse(response.message);
    } else if (response.type === "downloadCompleteResponse") {
        handleDownloadCompleteResponse();
    } else if (response.type === "cancelDownloadResponse") {
        handleDownloadCancelResponse();
    } else if (response.type === "downloadErrorResponse") {
        handleErrorResponse(response.message.statusText);
    } else if (response.type === "showRetryWaitResponse") {
        handleRetryWaitResponse();
    } else if (response.type === "showRetryStartedResponse") {
        handleRetryStartedResponse();
    } else if (response.type === "ERROR_RESPONSE") {
        handleErrorResponse(response.message.statusText);
    } else if (response.type === "resolutionResponse") {

    }
});

function getCurrentTabUrl() {
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, function(tabs) {
        var tab = tabs[0];
        var url = tab.url;
        sendMessageToBackground("getMediaRequest", {
            tabid : tab.id,
            taburl : url
        });
    });
}

function handleStatusDownloadResponse(response) {
    if (response.statusText === "No Downloading") {
        getCurrentTabUrl();
    } else if (response.statusText === "Downloading") {
        handleSuccessMediaResponse(response.mediadetails[0], true);
    } else if (response.statusText === "Retrying") {
        handleRetryWaitResponse();
        handleSuccessMediaResponse(response.mediadetails[0], true);
    }
}

function handleRetryWaitResponse () {
    download_progress.element.classList.remove("mdl-color--blue-600")
    download_progress.element.classList.add("mdl-progress-red");
}

function handleRetryStartedResponse () {
    download_progress.element.classList.remove("mdl-progress-red")
    download_progress.element.classList.add("mdl-color--blue-600");
}

function handleStartDownloadResponse() {
    download_progress.showElement();
    spinner.showElement();
    downloadlink.hideElement();
    cancelDownload.showElement();
    //resolution_box.hideElement();
}

function handleDownloadProgressResponse(response) {
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

function handleResolutionResponse (resolutions) {
    // resolution_box.element.innerText = "";
    // resolutions.reverse();
    // resolutions.forEach(function (resolution,index) {
    //     var e = document.createElement("option");
    //     e.innerText = resolution;
    //     e.value=index;
    //     resolution_box.element.appendChild(e);
    // });
}

function handleSuccessMediaResponse(mediaInfo, isDownloadStarted) {
    load_spinner.hideElement();
    load_message.hideElement();
    elementError.hideElement();
    elementError.showTextContent("");
    successElement.showElement();
    currentMediaID = mediaInfo.mediaid;
    if (!isDownloadStarted) {
        spinner.hideElement();
        download_progress.hideElement();
        downloadlink.hideElement();
        cancelDownload.hideElement();
        wait_button.showElement();
    } else {
        downloadlink.hideElement();
        wait_button.hideElement();
        spinner.showElement();
        download_progress.showElement();
        download_progress.element.MaterialProgress.setProgress(mediaInfo.downloaded);
        cancelDownload.showElement();
    }

    var mediaImageElement = new CustomElement("mediaImage");
    var mediaNameElement = new CustomElement("mediaName");
    if (mediaInfo.pictureURL)
        mediaImageElement.setProperty("src", mediaInfo.pictureURL);
    else
        mediaImageElement.hideElement();
    mediaNameElement.showTextContent(mediaInfo.medianame);
}

downloadlink.element.addEventListener("click", function(e) {
    sendMessageToBackground("startDownloadRequest", {
        mediaid: currentMediaID
    });
    downloadlink.hideElement();
    spinner.showElement();
    download_progress.showElement();
});

function handleErrorResponse(errorMessage) {
    load_message.hideElement();
    load_spinner.hideElement();
    elementError.showElement();
    elementError.showTextContent(errorMessage);
    successElement.hideElement();
}

function sendMessageToBackground(type, message) {
    chrome.runtime.sendMessage({
        type: type,
        message: message
    });
}