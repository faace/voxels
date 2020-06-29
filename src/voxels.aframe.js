(function () {
    var STATUS_IDLE = 0;
    var STATUS_MOVE = 1;
    var STATUS_TELEPROT = 2;


    AFRAME.registerSystem('voxels', {
        init: function () {
            this.size = 0.1;
            this.dir = this.preDir = 0; // 1 2 3 4 z+ x+ z- x-
            this.ms = 0;
            this.maxMs = 500;
            this.teleports = {};
            this.status = STATUS_IDLE;
            this.maps = [];
            this.events = {};

            this.ctlMove = 0;
            this.faceTo = 1;
        },
        addType: function (type, target, map, bound) {
            // if (!type) return;
            switch (type) {
                case 'map': {
                    target.map = map;
                    this.maps.push(target);
                    break;
                }
                case 'hero': {
                    this.status = STATUS_MOVE;
                    target.bound = bound;
                    this.hero = target;
                    this.hero.isMoving = false;
                    if (this.needHeroCamera) this.addHeroCamera();
                    break;
                }
                case 'item': {
                    target.map = map;
                    this.maps.push(target);
                    break;
                }
            }
            this.setTargetPos(target);
        },
        addEventListener: function (name, cb) {
            this.events[name] = this.events[name] || [];
            if (this.events[name].indexOf(cb) < 0) this.events[name].push(cb);
            return this;
        },
        removeEventListener: function (name, cb) {
            if (this.events[name]) {
                var idx = this.events[name].indexOf(cb);
                if (idx > -1) this.events[name].splice(idx, 1);
            }
        },
        setTargetPos: function (target, pos) {
            pos = pos || target.mapPos;
            target.object3D.position.set(pos.x * this.size, pos.y * this.size, pos.z * this.size);
        },
        isBlock: function (ms, x, y, z) {
            var m, mx, my, mz;
            for (var i = 0, m; i < ms.length; i++) {
                if (!ms[i].visible) continue;
                mx = ms[i].mapPos.x;
                my = ms[i].mapPos.y;
                mz = ms[i].mapPos.z;
                m = ms[i].map;
                if (m[y - my] && m[y - my][z - mz] && m[y - my][z - mz][x - mx]) return true;
            }
        },
        isOpacity: function (ms, x, y, z) {
            var m, mx, my, mz, one, opacity = 1;
            for (var i = 0, m; i < ms.length; i++) {
                if (!ms[i].visible) continue;
                mx = ms[i].mapPos.x;
                my = ms[i].mapPos.y;
                mz = ms[i].mapPos.z;
                m = ms[i].map;
                one = m[y - my] && m[y - my][z - mz] && m[y - my][z - mz][x - mx];
                if (!one) continue;
                if (one && (typeof one.opacity == 'undefined' || one.opacity >= 1)) return false;
                else opacity = one.opacity;
            }
            if (opacity < 1) return true;
        },
        moveHeroPosBy: function () {
            if (this.hero && this.maps.length > 0) {

                if (this.hero.isMoving) return;
                if (this.dir > 0 && this.dir != this.preDir) return this.setHeroRotation();
                var xx = 0, yy = 0, zz = 0;

                if (this.dir == 1) zz = 1;
                else if (this.dir == 3) zz = -1;
                else if (this.dir == 2) xx = 1;
                else if (this.dir == 4) xx = -1;
                else return;

                var c = this.hero.mapPos;
                var ms = this.maps;
                if (this.isBlock(ms, c.x + xx, c.y + yy, c.z + zz)) { // 要去的地方有阻碍
                    if (this.isBlock(ms, c.x + xx, c.y + yy + 1, c.z + zz)) return; // 上面走不了
                    if (this.isBlock(ms, c.x + xx, c.y + 1, c.z + zz)) return; // 如果头顶有定西，就无法向上
                    yy = 1;
                } else { // 需要判断脚下有没有路，有才能走
                    if (!this.isBlock(ms, c.x + xx, c.y + yy - 1, c.z + zz)) {
                        // 再看看能否下楼
                        if (!this.isBlock(ms, c.x + xx, c.y + yy - 2, c.z + zz)) return; // 脚下没路，不能走
                        if (this.isOpacity(ms, c.x + xx, c.y + yy - 2, c.z + zz)) return; // 是水，不能进去
                        yy = -1;

                    } else if (this.isOpacity(ms, c.x + xx, c.y + yy - 1, c.z + zz)) return; // 是水，不能进去
                }
                this.hero.isMoving = true;
                var anim = AFRAME.anim();
                if (yy > 0) { // 需要向上或者向下
                    c.y += yy;
                    c.z += zz;
                    c.x += xx;
                    anim.sequence(
                        anim.moveBy(200, { x: 0, y: yy * this.size, z: 0 }),
                        anim.cb(function () {
                            if (this.hero.anims && this.hero.anims.walk) this.hero.anims.walk(300);
                        }.bind(this)),
                        anim.moveBy(300, { x: xx * this.size, y: 0, z: zz * this.size }),
                        anim.cb(this.afterHeroAnim.bind(this))
                    )
                } else if (yy < 0) { // 需要向上或者向下
                    c.y += yy;
                    c.z += zz;
                    c.x += xx;
                    anim.sequence(
                        anim.cb(function () {
                            if (this.hero.anims && this.hero.anims.walk) this.hero.anims.walk(300);
                        }.bind(this)),
                        anim.moveBy(300, { x: xx * this.size, y: 0, z: zz * this.size }),
                        anim.moveBy(200, { x: 0, y: yy * this.size, z: 0 }),
                        anim.cb(this.afterHeroAnim.bind(this))
                    )
                } else {
                    c.y += yy;
                    c.z += zz;
                    c.x += xx;
                    anim.sequence(
                        anim.cb(function () {
                            if (this.hero.anims && this.hero.anims.walk) this.hero.anims.walk(500);
                        }.bind(this)),
                        anim.moveBy(500, { x: xx * this.size, y: yy * this.size, z: zz * this.size }),
                        anim.cb(this.afterHeroAnim.bind(this))
                    )
                }
                this.hero.animRun(anim);
            }
        },
        afterHeroAnim: function () {
            this.setTargetPos(this.hero);
            this.checkTeleport(function () {
                this.checkMoveEvent(function () {
                    this.hero.isMoving = false;
                    if (this.dir) this.moveHeroPosBy();
                    else if (this.hero.anims && this.hero.anims.stand) this.hero.anims.stand();
                }.bind(this));
            }.bind(this));
        },
        setHeroRotation: function (angle) {
            var angle;
            if (this.dir == 1) angle = 0; // zz= 1
            else if (this.dir == 3) { // zz = -1
                if (this.preDir == 4) this.hero.object3D.rotation.y += 2 * Math.PI;
                angle = 180;
            } else if (this.dir == 2) angle = 90; // xx = 1;
            else if (this.dir == 4) { // xx = -1
                if (this.preDir == 3) this.hero.object3D.rotation.y *= -1;
                angle = -90;
            }

            this.hero.isMoving = true;
            this.preDir = this.dir;
            var anim = AFRAME.anim();
            anim.sequence(
                anim.rotationTo(500, { x: 0, y: angle, z: 0 }),
                anim.cb(this.afterHeroAnim.bind(this))
            )

            this.hero.animRun(anim);
        },
        checkTeleport: function (cb) {
            var mapPos = this.hero.mapPos;
            var port = this.teleports[mapPos.y] && this.teleports[mapPos.y][mapPos.z] && this.teleports[mapPos.y][mapPos.z][mapPos.x];
            if (!port || port.length < 1) return cb && cb();
            var one = port[Math.floor(Math.random() * port.length)];

            this.status = STATUS_TELEPROT;

            var anim = AFRAME.anim();
            var size = this.size;
            anim.sequence(
                anim.spawn(
                    anim.fadeOut(1000),
                    anim.moveBy(1000, { x: 0, y: size, z: 0 }),
                ),
                anim.cb(function () {
                    this.hero.mapPos.copy(one);
                    this.setTargetPos(this.hero, one);
                }.bind(this)),
                anim.moveBy(10, { x: 0, y: size, z: 0 }),
                anim.spawn(
                    anim.fadeIn(1000),
                    anim.moveBy(1000, { x: 0, y: -size, z: 0 }),
                ),
                anim.cb(function () {
                    this.status = STATUS_MOVE;
                    cb && cb();
                }.bind(this)),
            );

            this.hero.animRun(anim);
        },
        setTeleports: function (teleports) { // x,y,z>x,y,z|x,y,z>x,y,z,
            var teleports = (teleports || '').split('|');
            var one, from, to, fx, fy, fz, yTel, zTel;
            for (var i = 0; i < teleports.length; i++) {
                one = teleports[i].split('>');
                if (one.length != 2) throw 'error data: [' + i + ']' + teleports[i]
                from = one[0].split(',');
                to = one[1].split(',');
                fx = parseInt(from[0]);
                fy = parseInt(from[1]);
                fz = parseInt(from[2]);

                yTel = this.teleports[fy] = this.teleports[fy] || {};
                zTel = yTel[fz] = yTel[fz] || {};
                zTel[fx] = zTel[fx] || [];
                zTel[fx].push({ x: parseInt(to[0]), y: parseInt(to[1]), z: parseInt(to[2]) });
            }
        },
        checkMoveEvent: function (cb) {
            if (this.events.heroMove && this.events.heroMove.length > 0) {
                var realCb = AFRAME.afterAllCallback(this.events.heroMove.length, cb)
                for (var i = 0; i < this.events.heroMove.length; i++) {
                    this.events.heroMove[i](this.hero.mapPos, realCb);
                }
            } else cb && cb();
        },
        addHeroCamera: function (camera1) {
            if (!this.cameras && camera1) {
                this.cameras = [1, camera1];
            }
            if (!this.hero) return this.needHeroCamera = true;
            delete this.needHeroCamera;
            var height = (this.hero.bound.maxY - this.hero.bound.minY + 1) / (this.hero.bound.maxZ - this.hero.bound.minZ + 1) * this.size * 1.1;
            var camera2 = this.hero.addAnEntity('a-entity', { camera: 'active: false', 'position': '0 ' + height + ' 0', rotation: '0 180 0' });
            if (this.cameras) {
                this.cameras.push(camera2);
                // this.cameras[0] = 2;
            } else {
                this.cameras = [1, camera2];
                this.cameras[1].setAttribute('camera', 'active', true);
            }
        },
        switchCamera: function (idx) {
            if (!idx) {
                idx = (this.cameras[0] + 1);
                if (idx >= this.cameras.length) idx = 1;
            }
            if (!this.cameras || !this.cameras[idx]) return; // 不存在
            if (this.cameras[0] == idx) return; // 不变
            this.cameras[idx].setAttribute('camera', 'active', true);
            this.cameras[0] = parseInt(idx);
        },
        afterHeroMoving: function () {
            this.setTargetPos(this.hero);
            this.checkTeleport(function () {
                this.checkMoveEvent(function () {
                    this.hero.isMoving = false;
                    if (this.ctlMove) this.moveHeroPosBy();
                    else if (this.hero.anims && this.hero.anims.stand) this.hero.anims.stand();
                }.bind(this));
            }.bind(this));
        },
        moveHeroByGodCamera: function () {
            if (!this.hero || this.maps.length < 1) return;
            if (this.hero.isMoving) return;

            // 如果是选择，就跳转到选择去
            if (this.ctlMove == 5) return this.rotateHero(false);
            else if (this.ctlMove == 6) return this.rotateHero(true);

            var faceTo, xx = 0, yy = 0, zz = 0;
            var heroMoveMap = {
                1: { // 面向+z
                    1: [0, -1], // 后s
                    2: [-1, 0], // 右d
                    3: [0, 1], // 前w
                    4: [1, 0], // 左a
                },
                3: { // 面向-z
                    1: [0, 1], // 后s
                    2: [1, 0], // 右d
                    3: [0, -1], // 前w
                    4: [-1, 0], // 左a
                },
                2: { // 面向+x
                    1: [-1, 0], // 后s
                    2: [0, 1], // 右d
                    3: [1, 0], // 前w
                    4: [0, -1], // 左a
                },
                4: { // 面向+x
                    1: [1, 0], // 后s
                    2: [0, -1], // 右d
                    3: [-1, 0], // 前w
                    4: [0, 1], // 左a
                },
            };

            // 需要根据旋转角度来控制

            faceTo = heroMoveMap[this.faceTo];
            if (!faceTo || !faceTo[this.ctlMove]) return;
            xx = faceTo[this.ctlMove][0];
            zz = faceTo[this.ctlMove][1];

            var c = this.hero.mapPos;
            var ms = this.maps;
            if (this.isBlock(ms, c.x + xx, c.y + yy, c.z + zz)) { // 要去的地方有阻碍
                if (this.isBlock(ms, c.x + xx, c.y + yy + 1, c.z + zz)) return; // 上面走不了
                if (this.isBlock(ms, c.x + xx, c.y + 1, c.z + zz)) return; // 如果头顶有定西，就无法向上
                yy = 1;
            } else { // 需要判断脚下有没有路，有才能走
                if (!this.isBlock(ms, c.x + xx, c.y + yy - 1, c.z + zz)) {
                    // 再看看能否下楼
                    if (!this.isBlock(ms, c.x + xx, c.y + yy - 2, c.z + zz)) return; // 脚下没路，不能走
                    if (this.isOpacity(ms, c.x + xx, c.y + yy - 2, c.z + zz)) return; // 是水，不能进去
                    yy = -1;

                } else if (this.isOpacity(ms, c.x + xx, c.y + yy - 1, c.z + zz)) return; // 是水，不能进去
            }
            this.hero.isMoving = true;
            var anim = AFRAME.anim();
            if (yy > 0) { // 需要向上或者向下
                c.y += yy;
                c.z += zz;
                c.x += xx;
                anim.sequence(
                    anim.moveBy(200, { x: 0, y: yy * this.size, z: 0 }),
                    anim.cb(function () {
                        if (this.hero.anims && this.hero.anims.walk) this.hero.anims.walk(300);
                    }.bind(this)),
                    anim.moveBy(300, { x: xx * this.size, y: 0, z: zz * this.size }),
                    anim.cb(this.afterHeroAnim.bind(this))
                )
            } else if (yy < 0) { // 需要向上或者向下
                c.y += yy;
                c.z += zz;
                c.x += xx;
                anim.sequence(
                    anim.cb(function () {
                        if (this.hero.anims && this.hero.anims.walk) this.hero.anims.walk(300);
                    }.bind(this)),
                    anim.moveBy(300, { x: xx * this.size, y: 0, z: zz * this.size }),
                    anim.moveBy(200, { x: 0, y: yy * this.size, z: 0 }),
                    anim.cb(this.afterHeroAnim.bind(this))
                )
            } else {
                c.y += yy;
                c.z += zz;
                c.x += xx;
                anim.sequence(
                    anim.cb(function () {
                        if (this.hero.anims && this.hero.anims.walk) this.hero.anims.walk(500);
                    }.bind(this)),
                    anim.moveBy(500, { x: xx * this.size, y: yy * this.size, z: zz * this.size }),
                    anim.cb(this.afterHeroAnim.bind(this))
                )
            }
            this.hero.animRun(anim);

        },
        rotateHero: function (clockwise) {
            // if (this.ctlMove > 0 && this.ctlMove != this.faceTo) return this.rotateHero(this.ctlMove);
            var nextFaceTo = {
                'true': { 1: 4, 4: 3, 3: 2, 2: 1 }, // 顺时针
                'false': { 1: 2, 2: 3, 3: 4, 4: 1 } // 逆时针
            };
            var faceTo = nextFaceTo[clockwise][this.faceTo];
            // console.log(faceTo, this.faceTo);
            var angle;
            if (faceTo == 1) angle = 0; // zz= 1
            else if (faceTo == 3) { // zz = -1
                if (this.faceTo == 4) this.hero.object3D.rotation.y += 2 * Math.PI;
                angle = 180;
            } else if (faceTo == 2) angle = 90; // xx = 1;
            else if (faceTo == 4) { // xx = -1
                if (this.faceTo == 3) this.hero.object3D.rotation.y *= -1;
                angle = -90;
            }

            this.hero.isMoving = true;
            this.faceTo = faceTo;
            var anim = AFRAME.anim();
            anim.sequence(
                anim.rotationTo(500, { x: 0, y: angle, z: 0 }),
                anim.cb(this.afterHeroMoving.bind(this))
            )

            this.hero.animRun(anim);
        },
        tick: function (ms, dms) {
            switch (this.status) {
                case STATUS_MOVE: {
                    // if (this.dir && !this.hero.isMoving) this.moveHeroPosBy();
                    if (this.ctlMove && !this.hero.isMoving) this.moveHeroByGodCamera();
                    break;
                }
                case STATUS_TELEPROT: break;
            }

            // if (this.anim) this.anim.tick(dms);
        },
    });

    AFRAME.registerComponent('voxels-sys', {
        schema: {
            size: { type: 'number', default: 0.1 },
            maxMs: { type: 'number', default: 500 },
            teleports: { type: 'string', default: '' }, // x y z: x y z, x y z: x y z,
        },

        init: function () {
            this.system = this.el.sceneEl.systems['voxels'];
            this.system.size = this.data.size;
            this.system.maxMs = this.data.maxMs;
            this.system.setTeleports(this.data.teleports);
            // this.system.teleports = ;
        }
    });

    AFRAME.registerComponent('voxels', {
        schema: {
            map: { type: 'string', default: '' },
            maps: { type: 'string', default: '' },
            mapIdx: { type: 'number', default: 0 },
            src: { type: 'string', default: '' },
            align: { type: 'string', default: 'center center center' },
            width: { type: 'number', default: 1 },
            height: { type: 'number', default: 1 },
            depth: { type: 'number', default: 1 },
            cell: { type: 'number', default: -1 },
            'cell-size': { type: 'number', default: -1 },
            textures: {
                default: {},// #dd0000_floor,#dddd00_box
                parse: function (value) {
                    var t = {};
                    if (typeof value == 'string') {
                        var list = value.trim().split(',');
                        list.forEach(function (one) {
                            one = one.trim();
                            var o = one.split('_');
                            if (o.length == 2) {
                                t[o[0].trim()] = o[1].trim();
                            }
                        })
                    }
                    return t;
                },
                stringify: function (value) {
                    var txt = '';
                    if (value) {
                        for (var i in value) {
                            if (txt) txt += ',';
                            txt += i + '_' + value[i];
                        }
                    }
                    return txt;
                }
            },
            opacities: {
                default: {},// #dd0000_0.5,#dddd00_0.8
                parse: function (value) {
                    var t = {};
                    if (typeof value == 'string') {
                        var list = value.trim().split(',');
                        list.forEach(function (one) {
                            one = one.trim();
                            var o = one.split('_');
                            if (o.length == 2) {
                                t[o[0].trim()] = parseFloat(o[1].trim());
                            }
                        })
                    }
                    return t;
                },
                stringify: function (value) {
                    var txt = '';
                    if (value) {
                        for (var i in value) {
                            if (txt) txt += ',';
                            txt += i + '_' + value[i];
                        }
                    }
                    return txt;
                }
            },
            faces: {
                default: { front: true, back: true, left: true, right: true, top: true, bottom: true },
                parse: function (value) {
                    var t;
                    if (typeof value == 'string') {
                        var list = value.trim().split(',');
                        if (list.length > 0) {
                            t = {};
                            list.forEach(function (one) {
                                t[one.trim()] = true;
                            })
                        }
                    }

                    return t || this.default;
                },
                stringify: function (value) {
                    var txt = '';
                    if (value) {
                        for (var i in value) {
                            if (txt) txt += ',';
                            txt += i;
                        }
                    }
                    return txt;
                }
            },
            anims: {
                default: {},
                parse: function (value) {
                    var t;
                    if (typeof value == 'string') {
                        var list = value.trim().split(';');
                        if (list.length > 0) {
                            t = {};
                            list.forEach(function (one) {
                                var a = one.trim().split(':');
                                var arr = a[1].trim().split(',');
                                for (var i = arr.length - 1; i--; i > -1) {
                                    arr[i] = arr[i].trim();
                                    if (arr[i].length < 1) arr[i].splice(i, 1);
                                }
                                if (arr.length > 0) t[a[0].trim()] = arr;
                            })
                        }
                    }

                    return t || this.default;
                },
                stringify: function (value) {
                    var txt = '';
                    if (value) {
                        for (var i in value) {
                            if (txt) txt += ',';
                            txt += i + ':' + value[i].join(',');
                        }
                    }
                    return txt;
                }
            },
            // anims: { type: 'string', default: '' },
            type: { type: 'string', default: '' },
        },

        init: function () {
            this.animIsPlaying = false;
            if (typeof 'mvPly2Map' != 'undefined' && this.data.src) {
                var srcs = this.data.src.split(';');
                if (srcs.length > 1) {
                    mvPly2Map.loadMaps(srcs, function (maps) {
                        this.createObject3Ds(maps);
                    }.bind(this));
                } else {
                    mvPly2Map.loadMap(this.data.src, function (map) {
                        this.createObject3D(map);
                    }.bind(this));
                }
            } else if (this.data.maps) {
                this.createObject3Ds(this.data.maps);
            } else this.createObject3D(this.data.map);
        },
        createMesh: function (map, cb) {
            var data = this.data;
            var info = {
                align: data.align,
                map: map,
                textures: data.textures,
                opacities: data.opacities,
                width: data.width,
                height: data.height,
                depth: data.depth,
                cellSize: data['cell-size'],
                showFaces: data.faces
            };
            // var colors = mvPly2Map.getAllColors(map);
            // console.log(colors);

            new Voxels(info).run(function (error, mesh, map, bound) {
                if (error) throw error;
                cb(mesh, map, bound);
            }.bind(this));
        },
        createObject3D: function (map) {
            if (map) {
                if (typeof map == 'string') map = JSON.parse(map);

                this.createMesh(map, function (mesh, newMap, bound) {
                    this.el.setObject3D('mesh', mesh);
                    AFRAME.addQuickAttributes(this.el);
                    this.el.mapPos = new THREE.Vector3().copy(this.el.position);
                    this.system.addType(this.data.type, this.el, newMap, bound);
                }.bind(this));
            }
        },
        createObject3Ds: function (maps) {
            if (maps) {
                if (typeof maps == 'string') maps = JSON.parse(maps);
                var group = new THREE.Group();
                var idx = 0;
                var b;
                var realCreate = function () {
                    if (idx >= maps.length) {
                        group.children[0].visible = true;
                        this.el.setObject3D('mesh', group);
                        AFRAME.addQuickAttributes(this.el);
                        this.el.mapPos = new THREE.Vector3().copy(this.el.position);
                        this.system.addType(this.data.type, this.el, {}, b);
                        this.setAnims();
                        return;
                    }

                    this.createMesh(maps[idx].map, function (mesh, newMap, bound) {
                        mesh.visible = false;
                        group.add(mesh);
                        idx++;
                        b = b || bound;
                        realCreate();
                    }.bind(this));
                }.bind(this);

                realCreate();
            }
        },
        setAnims: function () {
            var anims = this.data.anims;
            for (var i in anims) this.setOneAnim(this.el, i, anims[i]);
        },
        setOneAnim: function (target, type, frames, cb) {
            if (!target.anims) target.anims = {};
            target.anims[type] = function (ms, times) {
                var children = target.object3D.children[0].children;
                if (frames.length == 1) this.setChildrenVisbile(children, 0);
                else {
                    times = times || frames.length;
                    ms = ms / times;
                    var anim = AFRAME.anim();
                    var i = 0;
                    anim.sequence(
                        anim.cb(function () {
                            i = (i + 1) % frames.length;
                            this.setChildrenVisbile(children, frames[i]);
                        }.bind(this)),
                        anim.delay(ms)
                    ).repeat(times);
                    target.animRun(anim);;
                }
            }.bind(this);
        },
        setChildrenVisbile: function (children, idx) {
            for (var i = 0; i < children.length; i++) children[i].visible = idx == i;
        }
    });

    AFRAME.registerPrimitive('a-voxels', {
        defaultComponents: {
            voxels: {},
        },
        mappings: {
            map: 'voxels.map',
            src: 'voxels.src',
            align: 'voxels.align',
            width: 'voxels.width',
            height: 'voxels.height',
            depth: 'voxels.depth',
            cell: 'voxels.cell',
            'cell-size': 'voxels.cell-size',
            textures: 'voxels.textures',
            opacities: 'voxels.opacities',
            type: 'voxels.type',
            anims: 'voxels.anims',
            faces: 'voxels.faces',
        }
    });
})();