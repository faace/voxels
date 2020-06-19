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
        },
        addType: function (type, target, map) {
            if (!type) return;
            switch (type) {
                case 'map': {
                    console.log(map);
                    this.map = map;
                    this.updateTeleports()
                    break;
                }
                case 'hero': {
                    this.status = STATUS_MOVE;
                    this.hero = target;
                    this.heroMapPosition = { x: 0, y: 0, z: 0 };
                    this.heroRotation = target.el.object3D.rotation;
                    this.heroPosition = target.el.object3D.position;
                    this.setHeroPos(this.heroPosition.x, this.heroPosition.y, this.heroPosition.z);
                    break;
                }
                case 'item': {
                    this.setTargetPos(target, target.el.object3D.position);
                    break;
                }
            }
        },
        setHeroPos: function (x, y, z) {
            if (typeof x == 'object') {
                z = x.z;
                y = x.y;
                x = x.x;
            }
            this.heroMapPosition.x = x;
            this.heroMapPosition.y = y;
            this.heroMapPosition.z = z;
            this.heroPosition.set((x - 0.5) * this.size, (y - 0) * this.size, (z - 0.5) * this.size);
        },
        setTargetPos: function (target, pos) {
            target.el.object3D.position.set((pos.x - 0.5) * this.size, (pos.y - 0) * this.size, (pos.z - 0.5) * this.size);
        },
        moveHeroPos: function (xx, yy, zz) {
            if (this.hero && this.map) {

                var m = this.map;
                var c = this.heroMapPosition;
                xx = xx || 0;
                yy = yy || 0;
                zz = zz || 0;

                // if (xx) {
                //     this.chickRotation.y = (xx > 0 ? 0.5 : -0.5) * Math.PI;
                // } else if (zz) {
                //     this.chickRotation.y = (zz > 0 ? 0 : 1) * Math.PI;
                // }

                if (m[c.y + yy] && m[c.y + yy][c.z + zz] && m[c.y + yy][c.z + zz][c.x + xx]) { // 要去的地方有阻碍
                    if (m[c.y + yy + 1] && m[c.y + yy + 1][c.z + zz] && m[c.y + yy + 1][c.z + zz][c.x + xx]) { // 上面走不了
                        return;
                    } else { // 可以向上
                        if (m[c.y + 1] && m[c.y + 1][c.z] && m[c.y + 1][c.z][c.x]) return; // 如果头顶有定西，就无法向上
                        yy = 1;
                    }
                } else { // 需要判断脚下有没有路，有才能走
                    if (!m[c.y + yy - 1] || !m[c.y + yy - 1][c.z + zz] || !m[c.y + yy - 1][c.z + zz][c.x + xx]) {
                        // 再看看能否下楼
                        if (!m[c.y + yy - 2] || !m[c.y + yy - 2][c.z + zz] || !m[c.y + yy - 2][c.z + zz][c.x + xx]) return false;// 脚下没路，不能走
                        if (m[c.y + yy - 2][c.z + zz][c.x + xx].opacity) return false; // 是水，不能进去
                        yy = -1;
                    } else if (m[c.y + yy - 1][c.z + zz][c.x + xx].opacity) return false; // 是水，不能进去
                }

                c.y += yy;
                this.heroPosition.y += yy * this.size;
                c.z += zz;
                this.heroPosition.z += zz * this.size;
                c.x += xx;
                this.heroPosition.x += xx * this.size;

                this.checkTeleport();
            }
        },
        setHeroRotation: function (angle) {
            this.heroRotation.y = Math.PI * angle / 180;
        },
        checkTeleport: function () {
            var cell = this.map[this.heroMapPosition.y - 1][this.heroMapPosition.z][this.heroMapPosition.x];
            if (this.teleports[cell.color]) {
                this.status = STATUS_TELEPROT;

                var anim = AFRAME.anim();
                anim.sequence(
                    anim.spawn(
                        anim.fadeOut(1000),
                        anim.moveBy(1000, { x: 0, y: this.size, z: 0 }),
                    ),
                    anim.cb(function () {
                        this.setHeroPos(this.teleports[cell.color].x, this.teleports[cell.color].y + 1, this.teleports[cell.color].z);
                    }.bind(this)),
                    anim.moveBy(1, { x: 0, y: this.size, z: 0 }),
                    anim.spawn(
                        anim.fadeIn(1000),
                        anim.moveBy(1000, { x: 0, y: -this.size, z: 0 }),
                    ),
                    anim.cb(function () {
                        this.status = STATUS_MOVE;
                    }.bind(this)),
                );

                this.hero.el.animRun(anim);
            }
        },
        updateTeleports: function () { // find all the end port
            var teleports = this.teleports;
            var map = this.map, yMap, zMap, y, z, x, i;
            for (i in teleports) {
                for (y in map) {
                    yMap = map[y];
                    for (z in yMap) {
                        zMap = yMap[z];
                        for (x in zMap) {
                            if (zMap[x].color == teleports[i].color) {
                                teleports[i].x = parseInt(x);
                                teleports[i].y = parseInt(y);
                                teleports[i].z = parseInt(z);
                            }
                        }
                    }
                }
            }
            console.log(this.teleports);
        },
        // animFadeOut: function (dur, cb) {

        //     if (!AFRAME.anim) return cb();
        //     var anim = AFRAME.anim();
        //     anim.spawn(
        //         anim.fadeOut(1000),
        //         anim.moveBy(1000, { x: 0, y: this.size, z: 0 }),
        //         anim.cb(function () {
        //             console.log('yes');
        //         })
        //     )
        //     this.hero.el.animRun(anim);

        //     // // this.anim.fadeOut(dur, cb);
        //     // var a = new THREE.Vector3();
        //     // a.copy(this.hero.el.object3D.position);
        //     // a.y += 2;
        //     // this.anim.move(dur, this.hero.el.object3D.position, a, function () { });

        //     // this.anim.run();


        //     // var anim = AFRAME.anim();
        //     // anim.repeatForever(
        //     //     anim.sequence(
        //     //         anim.fadeIn(),
        //     //         anim.move(),
        //     //         anim.cb(cb),
        //     //     ));
        //     // this.hero.el.run(anim)

        // },
        // animFadeIn: function (dur, cb) {
        //     if (!AFRAME.anim) return cb();
        //     this.anim = AFRAME.anim(this.hero.el);
        //     this.anim.fadeIn(dur, cb);
        //     this.anim.run();
        // },
        tick: function (ms, dms) {
            switch (this.status) {
                case STATUS_MOVE: {
                    this.ms += dms;
                    if (this.ms > this.maxMs) {
                        while (this.ms > this.maxMs) this.ms -= this.maxMs;
                        switch (this.dir) {
                            case 1: { // z+
                                this.moveHeroPos(0, 0, 1);
                                this.setHeroRotation(0);
                                break;
                            }
                            case 3: { // z-
                                this.moveHeroPos(0, 0, -1);
                                this.setHeroRotation(190);
                                break;
                            }
                            case 2: { // x+
                                this.moveHeroPos(1, 0, 0);
                                this.setHeroRotation(90);
                                break;
                            }
                            case 4: { // x-
                                this.moveHeroPos(-1, 0, 0);
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
            teleports: {
                default: {},// #cc0099_#0033ff,#cc0099_#0033ff
                parse: function (value) {
                    var t = {};
                    if (typeof value == 'string') {
                        var list = value.trim().split(',');
                        list.forEach(function (one) {
                            one = one.trim();
                            var o = one.split('_');
                            if (o.length == 2) {
                                t[o[0].trim()] = { color: o[1].trim() };
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
                            txt += i + '_' + value[i].color;
                        }
                    }
                    return txt;
                }
            },
        },

        init: function () {
            this.system = this.el.sceneEl.systems['voxels'];
            this.system.size = this.data.size;
            this.system.maxMs = this.data.maxMs;
            this.system.teleports = this.data.teleports;
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
                var colors = mvPly2Map.getAllColors(data.map);
                console.log(colors);

                new Voxels(info).run(function (error, mesh, map) {
                    this.el.setObject3D('mesh', mesh);
                    if (this.data.type) this.system.addType(this.data.type, this, map);
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