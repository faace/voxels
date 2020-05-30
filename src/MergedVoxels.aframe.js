AFRAME.registerComponent('mergedvoxels', {
    schema: {
        src: { type: 'string', default: '' }
    },

    init: function () {
        if (this.data.src) {
            info = JSON.parse(this.data.src);
            var el = this.el;
            new MergedVoxels(info).run(function (error, mesh) {
                el.setObject3D('mesh', mesh);
            });
        }
    }
});

AFRAME.registerPrimitive('a-mergedvoxels', {
    defaultComponents: {
        MergedVoxels: {},
    },
    mappings: {
        src: 'mergedvoxels.src',
    }
});