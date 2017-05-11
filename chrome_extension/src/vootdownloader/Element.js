/**
 * Created by sghosh on 5/3/2017.
 */


function CustomElement (id) {
    this.id = id;
    this.element = document.querySelector("#" + id);
}

CustomElement.prototype.showElement = function () {
    this.element.style.display = "block";
}

CustomElement.prototype.hideElement = function () {
    this.element.style.display = "none";
}

CustomElement.prototype.showTextContent = function (text) {
    this.element.textContent = text;
}
CustomElement.prototype.setProperty = function (prop,val) {
    this.element.setAttribute(prop,val);
}