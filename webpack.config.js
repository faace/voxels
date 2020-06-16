const path = require('path');
// const webpack = require('webpack');
module.exports = {
    // mode: "production", // development
    entry: {
        'voxels.aframe.min': ['./src/mvPly2Map.js', './src/Voxels.js', './src/voxels.aframe.js'],
        'Voxels.min': ['./src/Voxels.js'],
    },
    output: {
        path: path.join(__dirname, '/dist'),
        filename: '[name].js'
    }
}