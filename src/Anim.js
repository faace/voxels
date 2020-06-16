(function () {
    var Anim = function (el) {
        this.el = el;
        // this.initConfig(config)
    };
    if (typeof AFRAME != 'undefined') AFRAME.anim = function (el) { return new Anim(el); };

    if (typeof window != 'undefined') window.Anim = Anim;
    else if (typeof module != 'undefined' && module.exports) module.exports = Anim;

    Anim.prototype.initConfig = function (conf, cb) {
        var self = this;
        var config = this.config = {
            autoplay: false,
            direction: 'normal',
            duration: 1000, // dur;
            easing: 'easeInOutQuad',
            elasticity: 400,
            loop: 0,
            round: false,
            complete: function () {
                self.isPlaying = false;
                cb();
            }
        };

        for (var i in conf) {
            if (typeof conf != 'undefined') config[i] = conf[i];
        }
        return config
    };
    Anim.prototype.fadeOut = function (dur, cb) {
        var config = this.initConfig({ dur: dur }, cb);

        // opacity need transparent is set to true;
        var m = this.el.object3DMap.mesh.material;
        if (Array.isArray(m)) m.forEach(function (one) { one.transparent = true; })
        else m.transparent = true;

        config.opacity = [1, 0];
        config.targets = m;

        return this;
    };
    Anim.prototype.fadeIn = function (dur, cb) {
        var config = this.initConfig({ dur: dur }, cb);

        // opacity need transparent is set to true;
        var m = this.el.object3DMap.mesh.material;
        if (Array.isArray(m)) m.forEach(function (one) { one.transparent = true; })
        else m.transparent = true;

        config.opacity = [0, 1];
        config.targets = m;

        return this;
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
})();