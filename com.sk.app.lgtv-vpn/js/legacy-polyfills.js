/* Lightweight polyfills for older webOS browser engines. */
(function () {
  if (!Date.now) {
    Date.now = function () {
      return new Date().getTime();
    };
  }

  if (!Function.prototype.bind) {
    Function.prototype.bind = function (context) {
      var fn = this;
      var presetArgs = Array.prototype.slice.call(arguments, 1);

      return function () {
        var args = presetArgs.concat(Array.prototype.slice.call(arguments));
        return fn.apply(context, args);
      };
    };
  }

  if (!String.prototype.trim) {
    String.prototype.trim = function () {
      return this.replace(/^\s+|\s+$/g, "");
    };
  }

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement, fromIndex) {
      var length = this.length >>> 0;
      var start = Number(fromIndex) || 0;
      var i;

      if (!length) {
        return -1;
      }

      if (start < 0) {
        start = Math.max(length + start, 0);
      }

      for (i = start; i < length; i += 1) {
        if (this[i] === searchElement) {
          return i;
        }
      }

      return -1;
    };
  }

  if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (callback, thisArg) {
      var i;

      for (i = 0; i < this.length; i += 1) {
        if (i in this) {
          callback.call(thisArg, this[i], i, this);
        }
      }
    };
  }

  if (!Array.prototype.filter) {
    Array.prototype.filter = function (callback, thisArg) {
      var result = [];
      var i;

      for (i = 0; i < this.length; i += 1) {
        if (i in this && callback.call(thisArg, this[i], i, this)) {
          result.push(this[i]);
        }
      }
      return result;
    };
  }
}());
