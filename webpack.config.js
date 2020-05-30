const path = require('path');
// const webpack = require('webpack');
module.exports = {
    // mode: "production", // development
    entry: {
        'MergedVoxels.aframe.min': ['./src/MergedVoxels.js', './src/MergedVoxels.aframe'],
        'MergedVoxels.min': ['./src/MergedVoxels.js'],
    },
    output: {
        path: path.join(__dirname, '/dist'),
        filename: '[name].js'
    }
}