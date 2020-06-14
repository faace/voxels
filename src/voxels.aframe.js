AFRAME.registerSystem('voxels', {
    init: function () {
        this.size = 0.1;
        this.dir = 0; // 1 2 3 4 z+ x+ z- x-
        this.ms = 0;
    },
    addType: function (type, target, map) {
        if (!type) return;
        switch (type) {
            case 'map': {
                console.log(map);
                this.map = map;
                break;
            }
            case 'hero': {
                this.hero = target;
                this.heroMapPosition = { x: 0, y: 0, z: 0 };
                this.heroPosition = target.el.object3D.position;
                this.heroRotation = target.el.object3D.rotation;
                this.setHeroPos(9, 8, 8);
                break;
            }
        }
    },
    setHeroPos: function (x, y, z) {
        this.heroMapPosition.x = x;
        this.heroMapPosition.y = y;
        this.heroMapPosition.z = z;
        this.heroPosition.set(x * this.size, y * this.size, z * this.size);
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
        }
    },
    setHeroRotation: function (angle) {
        this.heroRotation.y = Math.PI * angle / 180;
    },
    tick: function (ms, dms) {
        this.ms += dms;
        if (this.ms > 500) {
            this.ms -= 500;
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

        // this.step += this.baseStep;
    },
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
        type: { type: 'string', default: '' },
    },

    init: function () {
        if (typeof 'mvPly2Map' != 'undefined' && this.data.src) {
            mvPly2Map.loadMap(this.data.src, function (map) {
                this.data.map = map;
                this.cteateMesh();
            }.bind(this));
        } else this.cteateMesh();
    },
    cteateMesh: function () {
        if (this.data.map) {
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
            };
            // var colors = mvPly2Map.getAllColors(data.map);
            // console.log(colors);

            new Voxels(info).run(function (error, mesh, map) {
                this.el.setObject3D('mesh', mesh);
                if (this.data.type) this.system.addType(this.data.type, this, map);
            }.bind(this));


        }
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
    }
});