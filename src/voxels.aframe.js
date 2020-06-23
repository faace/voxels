(function () {
    var STATUS_IDLE = 0;
    var STATUS_MOVE = 1;
    var STATUS_TELEPROT = 2;


    AFRAME.registerSystem('voxels', {
        init: function () {
            this.size = 0.1;
            this.dir = 0; // 1 2 3 4 z+ x+ z- x-
            this.ms = 0;
            this.maxMs = 500;
            this.teleports = {};
            this.status = STATUS_IDLE;
            this.maps = [];
            this.events = {};
        },
        addType: function (type, target, map) {
            // if (!type) return;
            switch (type) {

                case 'map': {
                    target.map = map;
                    this.maps.push(target);
                    break;
                }
                case 'hero': {
                    this.status = STATUS_MOVE;
                    this.hero = target;
                    this.heroRotation = target.object3D.rotation;
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
        moveHeroPosBy: function (xx, yy, zz) {
            if (this.hero && this.maps.length > 0) {
                var c = this.hero.mapPos;
                xx = xx || 0;
                yy = yy || 0;
                zz = zz || 0;
                var ms = this.maps;

                if (this.isBlock(ms, c.x + xx, c.y + yy, c.z + zz)) { // 要去的地方有阻碍
                    if (this.isBlock(ms, c.x + xx, c.y + yy + 1, c.z + zz)) return; // 上面走不了
                    if (this.isBlock(ms, c.x + xx, c.y + 1, c.z + zz)) return; // 如果头顶有定西，就无法向上
                    yy = 1;
                } else { // 需要判断脚下有没有路，有才能走
                    if (!this.isBlock(ms, c.x + xx, c.y + yy - 1, c.z + zz)) {
                        // 再看看能否下楼
                        if (!this.isBlock(ms, c.x + xx, c.y + yy - 2, c.z + zz)) return; // 脚下没路，不能走
                        if (this.isOpacity(ms, c.x + xx, c.y + yy - 2, c.z + zz)) return false; // 是水，不能进去
                        yy = -1;

                    } else if (this.isOpacity(ms, c.x + xx, c.y + yy - 1, c.z + zz)) return false; // 是水，不能进去
                }
            }

            c.y += yy;
            c.z += zz;
            c.x += xx;
            this.setTargetPos(this.hero);
            console.log(c);
            this.checkTeleport();
            this.checkmoveEvent();
        },
        setHeroRotation: function (angle) {
            this.heroRotation.y = Math.PI * angle / 180;
        },
        checkTeleport: function () {
            var mapPos = this.hero.mapPos;
            var port = this.teleports[mapPos.y] && this.teleports[mapPos.y][mapPos.z] && this.teleports[mapPos.y][mapPos.z][mapPos.x];
            if (!port || port.length < 1) return;
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
        checkmoveEvent: function () {
            if (this.events.heroMove && this.events.heroMove.length > 0) {
                for (var i = 0; i < this.events.heroMove.length; i++) {
                    this.events.heroMove[i](this.hero.mapPos);
                }
            }
        },
        tick: function (ms, dms) {
            switch (this.status) {
                case STATUS_MOVE: {
                    this.ms += dms;
                    if (this.ms > this.maxMs) {
                        while (this.ms > this.maxMs) this.ms -= this.maxMs;
                        switch (this.dir) {
                            case 1: { // z+
                                this.moveHeroPosBy(0, 0, 1);
                                this.setHeroRotation(0);
                                break;
                            }
                            case 3: { // z-
                                this.moveHeroPosBy(0, 0, -1);
                                this.setHeroRotation(190);
                                break;
                            }
                            case 2: { // x+
                                this.moveHeroPosBy(1, 0, 0);
                                this.setHeroRotation(90);
                                break;
                            }
                            case 4: { // x-
                                this.moveHeroPosBy(-1, 0, 0);
                                this.setHeroRotation(-90);
                                break;
                            }
                        }
                    }
                    break;
                }
                case STATUS_TELEPROT: {
                    break;
                }
            }

            // if (this.anim) this.anim.tick(dms);
        },
    });

    AFRAME.registerComponent('voxels-sys', {
        schema: {
            size: { type: 'number', default: 0.1 },
            maxMs: { type: 'number', default: 500 },
            teleports: { type: 'string', default: '' }, // x y z: x y z, x y z: x y z,
            // teleports: {
            //     default: [],// x y z:x y z,x y z:x y z,
            //     parse: function (value) {
            //         var t = {};
            //         if (typeof value == 'string') {
            //             var list = value.trim().split(',');
            //             list.forEach(function (one) {
            //                 one = one.trim();
            //                 var o = one.split('_');
            //                 if (o.length == 2) {
            //                     t[o[0].trim()] = { color: o[1].trim() };
            //                 }
            //             })
            //         }
            //         return t;
            //     },
            //     stringify: function (value) {
            //         var txt = '';
            //         if (value) {
            //             for (var i in value) {
            //                 if (txt) txt += ',';
            //                 txt += i + '_' + value[i].color;
            //             }
            //         }
            //         return txt;
            //     }
            // },
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

                    return t || this.default;;
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
            type: { type: 'string', default: '' },
        },

        init: function () {
            this.animIsPlaying = false;
            if (typeof 'mvPly2Map' != 'undefined' && this.data.src) {
                mvPly2Map.loadMap(this.data.src, function (map) {
                    this.data.map = map;
                    this.cteateMesh();
                }.bind(this));
            } else this.cteateMesh();
        },
        cteateMesh: function () {
            if (this.data.map) {
                if (typeof this.data.map == 'string') this.data.map = JSON.parse(this.data.map);
                var data = this.data;
                var info = {
                    align: data.align,
                    map: data.map,
                    textures: data.textures,
                    opacities: data.opacities,
                    width: data.width,
                    height: data.height,
                    depth: data.depth,
                    cellSize: data['cell-size'],
                    showFaces: data.faces
                };
                // var colors = mvPly2Map.getAllColors(data.map);
                // console.log(colors);

                new Voxels(info).run(function (error, mesh, map) {
                    if (error) throw error;
                    this.el.setObject3D('mesh', mesh);
                    this.el.mapPos = new THREE.Vector3().copy(this.el.object3D.position);
                    this.system.addType(this.data.type, this.el, map);
                }.bind(this));
            }
        },
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
            faces: 'voxels.faces',
        }
    });
})();