AFRAME.registerComponent('mergeBlocks', {
    schema: {
        src: { type: 'string', default: '' }
    },

    init: function () {
        if (this.data.src) {
            info = JSON.parse(this.data.src);
            var el = this.el;
            new MergeBlocks(info).run(function (error, mesh) {
                el.setObject3D('mesh', mesh);
            });
        }
    }
});

AFRAME.registerPrimitive('a-mergeBlocks', {
    defaultComponents: {
        mergeBlocks: {},
    },
    mappings: {
        src: 'mergeBlocks.src',
    }
});