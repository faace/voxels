
AFRAME.registerComponent('voxels', {
    schema: {
        map: { type: 'string', default: '' },
        src: { type: 'string', default: '' },
        align: { type: 'string', default: 'center center center' },
        width: { type: 'number', default: 1 },
        height: { type: 'number', default: 1 },
        depth: { type: 'number', default: 1 },
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
            var el = this.el;
            var data = this.data;
            var info = {
                align: data.align,
                map: data.map,
                textures: data.textures,
                opacities: data.opacities,
                width: data.width,
                height: data.height,
                depth: data.depth,
            };
            var colors = mvPly2Map.getAllColors(data.map);
            console.log(colors);

            new Voxels(info).run(function (error, mesh) {
                el.setObject3D('mesh', mesh);
            });
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
        textures: 'voxels.textures',
        opacities: 'voxels.opacities',
    }
});