(function () {
    var Anim = function () {
        this.actions = [];
    };
    if (typeof AFRAME != 'undefined') AFRAME.anim = function () { return new Anim(); };

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
    Anim.prototype.move = function (dur, from, to, cb) {
        var config = this.initConfig({ dur: dur }, cb);

        // opacity need transparent is set to true;
        var m = this.el.object3D.position;
        if (Array.isArray(m)) m.forEach(function (one) { one.transparent = true; })
        else m.transparent = true;

        config.x = [from.x, to.x];
        config.y = [from.y, to.y];
        config.z = [from.z, to.z];
        console.log(config);
        config.targets = m;

        return this;
    };
    Anim.prototype.moveTo = function (dur, to, cb) {
        var config = this.initConfig({ dur: dur }, cb);

        // opacity need transparent is set to true;
        var m = this.el.object3D.position;
        if (Array.isArray(m)) m.forEach(function (one) { one.transparent = true; })
        else m.transparent = true;

        config.x = [m.x, to.x];
        config.y = [m.y, to.y];
        config.z = [m.z, to.z];
        console.log(config);
        config.targets = m;

        return this;
    };
    Anim.prototype.moveBy = function (dur, by, cb) {
        var config = this.initConfig({ dur: dur }, cb);

        // opacity need transparent is set to true;
        var m = this.el.object3D.position;
        if (Array.isArray(m)) m.forEach(function (one) { one.transparent = true; })
        else m.transparent = true;

        config.x = [m.x, m.x + (by.x || 0)];
        config.y = [m.y, m.y + (by.y || 0)];
        config.z = [m.z, m.z + (by.z || 0)];
        console.log(config);
        config.targets = m;

        return this;
    };

    Anim.prototype.sequence = function () { };

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

    Config.prototype.
})();