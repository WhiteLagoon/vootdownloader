function Fragment(baseuri, segmenturi, segmentid) {
    this.baseURI = baseuri;
    this.segmentUri = segmenturi;
    this.iv = null;
    this.segmentid = segmentid;
    this.callbacks = {
        onLoadComplete: null,
        onDecryptionComplete: null,
        onLoadError : null,
        onDecryptionError : null
    };
    this.maxRetry = 2;
    this.noRetry = 0;
}

Fragment.prototype.loadSegment = function() {
    var loader = new XhrLoader(this.baseURI  + this.segmentUri, "arraybuffer");
    loader.callbacks.onSuccess = onFragmentLoadCompleted.bind(this);
    loader.callbacks.onError = onFragmentLoadError.bind(this);
    this.cancelRequest = loader.load();
}

Fragment.prototype.cancelFragmentRequest = function () {
    if (this.cancelRequest) {
        this.cancelRequest();
    }
}

Fragment.prototype.decryptSegment = function(fragment) {
    if (this.enc) {
        var decrypter = new Decrypter(this.enc.decryptKey, this.iv.buffer, this.enc.method);
        decrypter.expandKey().then(function(aesKey) {
            decrypter.decrypt(fragment, aesKey).then(function(decData) {
                this.decryptedContent = decData;
                var onDecryptionComplete = this.callbacks.onDecryptionComplete;
                if (onDecryptionComplete) {
                    onDecryptionComplete(this.segmentid);
                }
            }.bind(this)).catch(function(err) {
                onFragmentDecryptionError.bind(this)(err);
            }.bind(this));
        }.bind(this));
    }
}

Fragment.prototype.addKeyToSegment = function(key, keymethod) {
    this.enc = {
        decryptKey: key,
        method: keymethod
    };
    this.iv = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, parseInt(this.segmentid) + 1]);
}

function onFragmentLoadCompleted(fragment) {
    this.decryptedContent = fragment;
    var onLoadComplete = this.callbacks.onLoadComplete;
    if (onLoadComplete) {
        onLoadComplete(this.segmentid);
        if (this.enc)
            this.decryptSegment(fragment);
    }
}

function onFragmentLoadError() {
    if (this.noRetry < this.maxRetry) {
        this.noRetry++;
        this.loadSegment();
    } else {
        onFragmentError.bind(this)("fragment loading max retry completed .. please reload the app.");
        var onLoadError = this.callbacks.onLoadError;
        if (onLoadError) {
            onLoadError ();
        }
    }
}

function onFragmentDecryptionError(error) {
    onFragmentError.bind(this)("fragment decryption error ... invalid key");
    var onDecryptionError = this.callbacks.onDecryptionError;
    if (onDecryptionError) {
        onDecryptionError ();
    }
}

function onFragmentError(errorMessage) {
    console.log(errorMessage);
}