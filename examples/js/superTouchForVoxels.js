(function () {
    if (typeof AFRAME == 'undefined') throw '[super touch] AFRAME should be loaded first.';

    const PI = Math.PI, subPI = -PI;
    const PI2 = Math.PI * 2, subPI2 = -PI2;
    const PI_25 = Math.PI * 0.25;
    const PI_5 = Math.PI * 0.5;

    var getRangeSchema = function (min, max, scale) {
        scale = scale || 1;
        return {
            default: { min: min, max: max },// #dd0000_floor,#dddd00_box
            parse: function (value) {
                var t = { min: min, max: max };
                if (typeof value == 'string') {
                    var list = value.trim().split(' ');
                    var l0 = parseFloat(list[0] * scale), l1 = parseFloat(list[1] * scale);
                    t.min = Math.min(l0, l1);
                    t.max = Math.max(l0, l1);
                }
                return t;
            },
            stringify: function (value) {
                return (value.min / scale) + ' ' + (value.max / scale);
            }
        };
    };

    AFRAME.registerComponent('super-touch', {

        schema: {
            touchTarget: { type: 'string' },
            rotationY: getRangeSchema(-Math.PI, Math.PI, PI / 180),
            rotationX: getRangeSchema(-Math.PI, Math.PI, PI / 180),
            rotationZ: getRangeSchema(-Math.PI, Math.PI, PI / 180),
            scale: getRangeSchema(0.01, 2, 1),
        },

        init: function () {
            this.registerEvents();
            this.system = this.el.sceneEl.systems['voxels'];
            this.scaleStep = (this.data.scale.max - this.data.scale.min) * 0.1;
        },

        registerEvents: function () {
            var touchTarget = this.touchTarget = this.data.touchTarget ? document.querySelector(this.data.touchTarget) : document;

            if (touchTarget) {
                if (this.isPC()) {
                    this.downs = [false, false, false];

                    touchTarget.addEventListener('keydown', this.keyDown.bind(this));
                    touchTarget.addEventListener('keyup', this.keyUp.bind(this));

                    touchTarget.addEventListener('mousedown', this.mouseDown.bind(this));
                    touchTarget.addEventListener('mousemove', this.mouseMove.bind(this));
                    touchTarget.addEventListener('mouseup', this.mouseUp.bind(this));
                    touchTarget.addEventListener('mousewheel', this.mouseWheel.bind(this));



                    document.oncontextmenu = function () { return false; }
                } else {
                    touchTarget.addEventListener('touchstart', this.touchStart.bind(this));
                    touchTarget.addEventListener('touchmove', this.touchMove.bind(this));
                    touchTarget.addEventListener('touchend', this.touchEnd.bind(this));
                    touchTarget.addEventListener('touchcancel', this.touchEnd.bind(this));
                }
            } else console.log('Error touchTarget!');
        },
        keyDown: function (evt) {
            // console.log(evt.keyCode);
            switch (evt.keyCode) {
                case 83: { // s 后退
                    this.system.ctlMove = 1;
                    break;
                }
                case 68: { // d 右移
                    this.system.ctlMove = 2;
                    break;
                }
                case 87: { // w 前进
                    this.system.ctlMove = 3;
                    break;
                }
                case 65: { // a 左移
                    this.system.ctlMove = 4
                    break;
                }
                case 81: { // q 左转
                    this.system.ctlMove = 5;
                    // this.system.rotateHero(false);
                    break;
                }
                case 69: { // e 右转
                    this.system.ctlMove = 6
                    // this.system.rotateHero(true);
                    break;
                }

                case 189: { // -
                    this.system.scaleDown();
                    break;
                }
                case 187: { // +
                    this.system.scaleUp();
                    break;
                }
                case 38: { // 旋转的上
                    this.system.rotation(0, 0.02);
                    break;
                }
                case 37: { // 旋转的左
                    this.system.rotation(-0.02, 0);
                    break;
                }
                case 40: {  // 旋转的下
                    this.system.rotation(0, -0.02);
                    break;
                }
                case 39: {  // 旋转的右边
                    this.system.rotation(0.02, 0);
                    break;
                }
            }
        },
        keyUp: function (evt) {
            // console.log('>' + evt.keyCode);
            switch (evt.keyCode) {
                case 87: { // w 前进
                    if (this.system.ctlMove == 3) this.system.ctlMove = 0;
                    break;
                }
                case 65: { // a 左边
                    if (this.system.ctlMove == 4) this.system.ctlMove = 0;
                    break;
                }
                case 83: { // s 后退
                    if (this.system.ctlMove == 1) this.system.ctlMove = 0;
                    break;
                }
                case 68: { // d 右边
                    if (this.system.ctlMove == 2) this.system.ctlMove = 0;
                    break;
                }
                case 81: { // q 左转
                    if (this.system.ctlMove == 5) this.system.ctlMove = 0;
                    break;
                }
                case 69: { // e 右转
                    if (this.system.ctlMove == 6) this.system.ctlMove = 0;
                    break;
                }
            }


        },
        mouseDown: function (evt) { // evt.type == 'touchstart'
            this.rotation = this.el.object3D.rotation;

            if (evt.buttons == 4) { // middle
                this.isButtons4 = true;
            }
            this.clientX = evt.clientX;
            this.clientY = evt.clientY;
            evt.stopPropagation();
            evt.preventDefault();
        },
        mouseMove: (function () {
            var deltaX, deltaY;
            var step = 40;

            return function (evt) {
                // console.log(evt.button, evt.buttons, this.downs);
                if (this.downs[evt.buttons]) {
                    // console.log(evt.buttons);
                    switch (evt.buttons) {
                        case 1: { //  left
                            deltaX = evt.clientX - this.clientX;
                            deltaY = evt.clientY - this.clientY;
                            if (Math.abs(deltaX) < step && Math.abs(deltaY) < step) break;

                            if (Math.abs(deltaX) > Math.abs(deltaY)) { // 左右
                                this.system.ctlMove = (deltaX > 0) ? 2 : 4; // 右移 左移
                            } else {
                                this.system.ctlMove = (deltaY > 0) ? 3 : 1; // 前进 后退
                            }

                            this.clientX = evt.clientX;
                            this.clientY = evt.clientY;
                            break;
                        }
                        case 2: { // right
                            deltaX = evt.clientX - this.clientX;
                            deltaY = evt.clientY - this.clientY;
                            this.clientX = evt.clientX;
                            this.clientY = evt.clientY;

                            this.system.rotation(deltaX * 0.01, deltaY * 0.01);

                            break;
                        }
                        case 4: { //  mid
                            deltaX = evt.clientX - this.clientX;
                            if (Math.abs(deltaX) < step) break;
                            if (this.isButtons4) this.isButtons4 = false;

                            this.system.ctlMove = (deltaX > 0) ? 6 : 5; // 右转 左转

                            this.clientX = evt.clientX;
                            this.clientY = evt.clientY;
                            break;
                        }
                    }
                }
                evt.stopPropagation();
                evt.preventDefault();
            }
        })(),
        mouseUp: function (evt) {
            this.system.ctlMove = 0;
            if (this.isButtons4) {
                this.isButtons4 = false;
                this.system.switchCamera();
            }
            evt.stopPropagation();
            evt.preventDefault();
        },
        mouseWheel: function (evt) {
            if (evt.wheelDelta > 0) this.system.scaleUp(); // 向上滚，变大
            else this.system.scaleDown();

        },
        touchStart: function (evt) { // evt.type == 'touchstart'
            if (this.isDown) return;
            this.distance = 0;
            this.system.ctlMove = 0;
            this.isDown = true;
            this.scaleStatus = touches.length == 2 ? 1 : 0; // 0 no two fingers, 1: is two fingers
            var touches = evt.touches;
            this.clientX = touches[0].clientX;
            this.clientY = touches[0].clientY;

            if (touches.length > 1) {
                this.distance = (touches[0].clientX - touches[1].clientX) * (touches[0].clientX - touches[1].clientX)
                    + (touches[0].clientY - touches[1].clientY) * (touches[0].clientY - touches[1].clientY);
            } else this.distance = false;
        },
        touchMove: (function () {
            var deltaX, deltaY;
            var touches;
            var step = 40;
            var distance;

            return function (evt) {
                if (this.isDown) {
                    touches = evt.touches;

                    if (touches.length == 3) { // 三指， 旋转，但是只判断第一个触摸屏

                        deltaX = touches[0].clientX - this.clientX;
                        deltaY = touches[0].clientY - this.clientY;
                        this.clientX = touches[0].clientX;
                        this.clientY = touches[0].clientY;

                        this.system.rotation(deltaX * 0.01, deltaY * 0.01);
                    } else if (touches.length == 2) { // 双指，放大缩小
                        this.clientX = touches[0].clientX;
                        this.clientY = touches[0].clientY;
                        if (this.scaleStatus == 0) this.scaleStatus = 1;
                        distance = (touches[0].clientX - touches[1].clientX) * (touches[0].clientX - touches[1].clientX)
                            + (touches[0].clientY - touches[1].clientY) * (touches[0].clientY - touches[1].clientY);
                        if (!this.distance) this.distance = distance;
                        else if (Math.abs(this.distance - distance) > 20) {
                            this.scaleStatus = 2;
                            if (distance > this.distance) this.system.scaleUp(); // 向上滚，变大
                            else this.system.scaleDown();
                            // var gap = 0.001 * (distance > this.distance ? 1 : -1)
                            // var scale = this.el.object3D.scale.z + gap * Math.sqrt(Math.abs(distance - this.distance));
                            // if (scale < 0.3) scale = 0.3;
                            // else if (scale > 3) scale = 3;
                            // this.el.object3D.scale.x = this.el.object3D.scale.y = this.el.object3D.scale.z = scale;
                            this.distance = distance;
                        }
                    } else { // 只判断1指的前后左右平移操作
                        deltaX = touches[0].clientX - this.clientX;
                        deltaY = touches[0].clientY - this.clientY;

                        this.distance = false;

                        if (Math.abs(deltaX) < step && Math.abs(deltaY) < step) break;

                        if (Math.abs(deltaX) > Math.abs(deltaY)) { // 左右
                            this.system.ctlMove = (deltaX > 0) ? 2 : 4; // 右移 左移
                        } else {
                            this.system.ctlMove = (deltaY > 0) ? 3 : 1; // 前进 后退
                        }

                        this.clientX = touches[0].clientX;
                        this.clientY = touches[0].clientY;
                    }
                }
            }
        })(),
        touchEnd: function (evt) {
            if (this.scaleStatus == 1) {
                this.scaleStatus = 0;
                this.system.ctlMove = 6;
                setTimeout(function () {
                    this.system.ctlMove = 0;
                }.bind(this), 500);
            }
            this.isDown = false;
        },

        remove: function () {
            var touchTarget = this.touchTarget;
            if (touchTarget) {
                if (this.isPC()) {
                    touchTarget.removeEventListener('keydown', this.keyDown.bind(this));
                    touchTarget.removeEventListener('keyup', this.keyUp.bind(this));

                    touchTarget.removeEventListener('mousedown', this.mouseDown.bind(this));
                    touchTarget.removeEventListener('mousemove', this.mouseMove.bind(this));
                    touchTarget.removeEventListener('mouseup', this.mouseUp.bind(this));
                    touchTarget.removeEventListener('mousewheel', this.mouseUp.bind(this));
                } else {
                    touchTarget.removeEventListener('touchstart', this.touchStart.bind(this));
                    touchTarget.removeEventListener('touchmove', this.touchMove.bind(this));
                    touchTarget.removeEventListener('touchend', this.touchEnd.bind(this));
                    touchTarget.removeEventListener('touchcancel', this.touchEnd.bind(this));
                }
            }
        },

        isPC: function () {
            var userAgentInfo = navigator.userAgent;
            var Agents = ['Android', 'iPhone', 'iPad', 'iPod', 'SymbianOS', 'Windows Phone'];
            for (var v = 0; v < Agents.length; v++) {
                if (userAgentInfo.indexOf(Agents[v]) > 0) return false;
            }
            return true;
        },

        // tick: function (time, timeDelta) {
        //     // Do something on every scene tick or frame.
        // }
    });

})();
