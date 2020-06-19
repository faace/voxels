(function () {
    var Anim = function () {
        this.actions = [];
    };
    if (typeof AFRAME != 'undefined') AFRAME.anim = function () { return new Anim(); };

    if (typeof window != 'undefined') window.Anim = Anim;
    else if (typeof module != 'undefined' && module.exports) module.exports = Anim;

    Anim.prototype.initConfig = function (conf) {
        return new Config();
    };
    Anim.prototype.fadeOut = function (dur) {
        return new Config().setDuration(dur).setType('fadeOut');
    };
    Anim.prototype.fadeIn = function (dur) {
        return new Config().setDuration(dur).setType('fadeIn');
    };
    Anim.prototype.move = function (dur, from, to) {
        return new Config().setDuration(dur).setFrom(from).setTo(to).setType('move');
    };
    Anim.prototype.moveTo = function (dur, to) {
        return new Config().setDuration(dur).setTo(to).setType('moveTo');
    };
    Anim.prototype.moveBy = function (dur, by) {
        return new Config().setDuration(dur).setBy(by).setType('moveBy');
    };
    Anim.prototype.cb = function (cb, target) {
        return new Config().setCb(cb, target).setType('cb');
    };

    Anim.prototype.sequence = function () {
        return new Config().setSequence(arguments).setType('sequence');
    };

    Anim.prototype.run = function () {
        this.animation = AFRAME.ANIME(this.config);
        this.time = 0;
        this.isPlaying = true;
    };
    Anim.prototype.tick = function (dms) {
        if (!this.isPlaying) return;
        this.time += dms;
        this.animation.tick(this.time);
    };




    var Config = function () {
        this.repeat = 1;
        this.config = {
            autoplay: false,
            direction: 'normal',
            duration: 1000, // dur;
            easing: 'easeInOutQuad',
            elasticity: 400,
            loop: 0,
            round: false,
        };
    };
    Config.prototype.setType = function (type) {
        this.type = type;
        return this;
    };
    Config.prototype.setDuration = function (ms) {
        this.config.duration = parseInt(ms);
        return this;
    };
    Config.prototype.setFrom = function (from) {
        this.from = from;
        return this;
    };
    Config.prototype.setTo = function (to) {
        this.from = to;
        return this;
    };
    Config.prototype.setBy = function (ty) {
        this.by = by;
        return this;
    };
    Config.prototype.setCb = function (cb, taget) {
        this.cb = cb;
        this.taget = taget;
        return this;
    };
    Config.prototype.setSequence = function () {
        var sequence = this.sequence = [];
        for (var i = 0; i < arguments.length; i++) {
            sequence.push(arguments[i]);
        }
    };
})();