function FragmentsManager(videoSegments) {
    this.fragments = videoSegments;
    this.currentFragmentIndex = 0;
    this.loadedFragmentIndex = new Array(this.fragments.length);
    this.decryptedFragmentIndex = new Array(this.fragments.length);
    this.timer = null;
    this.callbacks = {
        onDownloadComplete: null,
        onDownloadProgress: null,
        onDownloadError: null,
        onFragmentErrorLoad : null
    };
    this.status = "";
}

FragmentsManager.prototype.startLoadFragments = function() {
    this.loadNextFragment();
};

FragmentsManager.prototype.loadNextFragment = function() {
    this.fragments[this.currentFragmentIndex].callbacks.onLoadComplete = onFragmentCompleteCallback.bind(this);
    this.fragments[this.currentFragmentIndex].callbacks.onDecryptionComplete = onFragmentDecryptionSuccessCallback.bind(this);
    this.fragments[this.currentFragmentIndex].callbacks.onLoadError = onFragmentLoadErrorCallback.bind(this);
    this.fragments[this.currentFragmentIndex].callbacks.onDecryptionError = onFragmentDecryptionErrorCallback.bind(this);
    this.fragments[this.currentFragmentIndex].loadSegment();
};

FragmentsManager.prototype.cancelCurrentFragment = function () {
    if (this.currentFragmentIndex < this.fragments.length)
        this.fragments[this.currentFragmentIndex].cancelFragmentRequest();
    else
        console.log ("wait for sometime to download the file")
};

FragmentsManager.prototype.checkAllDecryptionCompleted = function() {
    var noOfDecrypted = this.decryptedFragmentIndex.filter(function(x) {
        return x === true;
    });
    var isEncryptionAvailable = this.fragments.filter(function(x) {
        return !(typeof x.enc === "undefined")
    });
    if (noOfDecrypted.length === this.fragments.length || isEncryptionAvailable.length === 0) {
        clearTimeout(this.timer);
        console.log("all parts downloaded successfully... lets merge it");
        this.mergeAllSegments();
    } else {
        this.timer = setTimeout(this.checkAllDecryptionCompleted.bind(this), 2000);
    }
};

FragmentsManager.prototype.mergeAllSegments = function() {
    var blobData = new Blob([]);
    this.fragments.forEach(function (fragment,index){
        blobData = new Blob([blobData,fragment.decryptedContent]);
        this.fragments[index] = null;
    }.bind(this));

    var onDownloadComplete = this.callbacks.onDownloadComplete;
    if (onDownloadComplete) {
        onDownloadComplete(blobData);
    }
}

function onFragmentCompleteCallback(segment_id) {
    this.currentFragmentIndex++;
    this.loadedFragmentIndex[segment_id] = true;
    if (this.currentFragmentIndex < this.fragments.length)
        if (this.status === "") {
            this.loadNextFragment();
            if (!this.fragments[segment_id].enc) {
                var onDownloadProgress = this.callbacks.onDownloadProgress;
                if (onDownloadProgress) {
                    onDownloadProgress(segment_id + 1);
                }
            }
        } else {
            console.log(this.status + " ... please reload the app");
        }
    else {
        this.checkAllDecryptionCompleted();
    }
}

function onFragmentDecryptionSuccessCallback(segment_id) {
    this.decryptedFragmentIndex[segment_id] = true;
    var onDownloadProgress = this.callbacks.onDownloadProgress;
    if (onDownloadProgress) {
        onDownloadProgress(segment_id + 1);
    }
}

function onFragmentDecryptionErrorCallback() {
    this.status = "Fragment Decryption load ERROR";
    var onDownloadError = this.callbacks.onDownloadError;
    if (onDownloadError) {
        onDownloadError(this.status);
    }
}

function onFragmentLoadErrorCallback() {
    this.status = "Fragment load ERROR";
    var onFragmentErrorLoad = this.callbacks.onFragmentErrorLoad;
    if (onFragmentErrorLoad) {
        onFragmentErrorLoad(this.status);
    }
}