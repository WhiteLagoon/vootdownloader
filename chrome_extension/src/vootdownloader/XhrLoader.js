function XhrLoader(url, responseType) {
    this.url = url;
    this.responseType = responseType;
    this.maxRetry = 3;
    this.noRetry = 0;
    this.callbacks = {
        onSuccess: null,
        onError: null,
        onProgress: null
    };
}

XhrLoader.prototype.load = function() {
    //console.log("loading url content");
    var xhr = new XMLHttpRequest();
    xhr.open("GET", this.url, true);
    if (this.responseType === "arraybuffer") {
        xhr.responseType = this.responseType;
    }
    xhr.onreadystatechange = onReadyStateChange.bind(this);
    xhr.onerror = onRequestTimeOut.bind(this);
    xhr.send();
    return function () {
        xhr.abort();
    }
}

function onReadyStateChange(event) {
    var target = event.currentTarget;
    if (target.readyState === 4 && target.status === 200) {
        var onSuccess = this.callbacks.onSuccess;
        if (onSuccess) {
            if (this.responseType === "arraybuffer") {
                var responseByteContent = target.response;
                onSuccess(responseByteContent);
            } else {
                var responseText = target.responseText;
                onSuccess(responseText);
            }
        }
    } else if (target.status >= 400 && target.status < 500) {
        var onError = this.callbacks.onError;
        if (onError) {
            var response = target.response;
            onError(response);
        }
    }
}

function onRequestTimeOut(event) {
    var target = event.currentTarget;
    var onError = this.callbacks.onError;
    if (onError) {
        var response = target.response;
        onError(response);
    }
}