function FragmentsManager(videoSegments) {
    this.fragments = videoSegments;
    this.currentFragmentIndex = 0;
    this.loadedFragmentIndex = new Array(this.fragments.length);
    this.decryptedFragmentIndex = new Array(this.fragments.length);
    this.timer = null;
    this.callbacks = {
        onDownloadComplete: null,
        onDownloadProgress: null,
        onDownloadError: null
    };
    this.status = "";
}

FragmentsManager.prototype.startLoadFragments = function() {
    this.loadNextFragment();
}

FragmentsManager.prototype.loadNextFragment = function() {
    this.fragments[this.currentFragmentIndex].callbacks.onLoadComplete = onFragmentCompleteCallback.bind(this);
    this.fragments[this.currentFragmentIndex].callbacks.onDecryptionComplete = onFragmentDecryptionSuccessCallback.bind(this);
    this.fragments[this.currentFragmentIndex].callbacks.onLoadError = onFragmentLoadErrorCallback.bind(this);
    this.fragments[this.currentFragmentIndex].callbacks.onDecryptionError = onFragmentDecryptionErrorCallback.bind(this);
    this.fragments[this.currentFragmentIndex].loadSegment();
}

FragmentsManager.prototype.checkAllDecryptionCompleted = function() {
    var noOfDecrypted = this.decryptedFragmentIndex.filter(function(x) {
        return x === true;
    });
    if (noOfDecrypted.length === this.fragments.length) {
        clearTimeout(this.timer);
        console.log("all parts downloaded successfully... lets merge it");
        this.mergeAllSegments();
    } else {
        this.timer = setTimeout(this.checkAllDecryptionCompleted.bind(this), 2000);
    }
}

FragmentsManager.prototype.mergeAllSegments = function() {
    var mergedBlob = this.fragments.reduce(function(mergedSegment, fragment) {
        mergedSegment.push(fragment.decryptedContent);
        return mergedSegment;
    }, []);
    var onDownloadComplete = this.callbacks.onDownloadComplete;
    if (onDownloadComplete) {
        onDownloadComplete(mergedBlob);
    }
}

function onFragmentCompleteCallback(segment_id) {
    this.currentFragmentIndex++;
    this.loadedFragmentIndex[segment_id] = true;
    if (this.currentFragmentIndex < this.fragments.length)
        if (this.status === "")
            this.loadNextFragment();
        else{
            setTextToExtension("");
            console.log(status + " ... please reload the app");
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
        onDownloadError(status);
    }
}

function onFragmentLoadErrorCallback() {
    this.status = "Fragment load ERROR";
    var onDownloadError = this.callbacks.onDownloadError;
    if (onDownloadError) {
        onDownloadError(status);
    }
}