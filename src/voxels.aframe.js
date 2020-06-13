AFRAME.registerSystem('voxels', {
    init: function () {
        this.targets = {};
        this.pos = {};
        this.size = 0.1;
        this.dir = 0; // 1 2 3 4 z+ x+ z- x-
        this.ms = 0;
    },
    addType: function (type, target) {
        if (!type) return;

        this.targets[type] = target;
        this.pos[type] = target.el.object3D.position;

        if (type == 'hero') {
            this.hero = target;
            this.heroPosition = target.el.object3D.position;
            this.heroRotation = target.el.object3D.rotation;
            this.setHeroPos(9, 8, 8);
        }
    },
    setHeroPos: function (x, y, z) {
        this.hero.xx = x;
        this.hero.yy = y;
        this.hero.zz = z;
        this.heroPosition.set(x * this.size, y * this.size, z * this.size);
    },
    setHeroRotation: function (angle) {
        this.heroRotation.y = Math.PI * angle / 180;
    },
    moveHeroPos: function (mx, my, mz) {
        if (this.hero) {
            this.hero.xx += mx;
            this.hero.ty += my;
            this.hero.zz += mz;
            this.setHeroPos(this.hero.xx, this.hero.yy, this.hero.zz);
        }
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
            var colors = mvPly2Map.getAllColors(data.map);
            console.log(colors);

            new Voxels(info).run(function (error, mesh) {
                this.el.setObject3D('mesh', mesh);
                if (this.data.type) this.system.addType(this.data.type, this);
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