function Decrypter (key,iv,method) {
    this.key =key;
    this.method=method;
    this.iv = iv;
}

Decrypter.prototype.expandKey = function () {
    return crypto.subtle.importKey('raw', this.key, {name: 'AES-CBC'}, false, ['encrypt', 'decrypt']);
}

Decrypter.prototype.decrypt = function (encFragment,aesKey)  {
    return crypto.subtle.decrypt({name: 'AES-CBC', iv: this.iv}, aesKey, encFragment);
}