let fs = require('fs');
let path = require('path');
let mvPly2Map = require('./mvPly2Map');
let config = {
    // src: 'chick',
    // dst: 'chick',
    srcPath: path.join(__dirname, '../ply/'),
    dstPath: path.join(__dirname, '../maps/'),
    // format: true
};


let parse = function (src, dst) {
    let srcFile = path.join(config.srcPath, src + '.ply');
    let plyText = fs.readFileSync(srcFile, { encoding: 'utf-8' });
    let map = mvPly2Map.parse(plyText);

    dst = dst || src;
    let dstFile = path.join(config.dstPath, dst + '.js');
    fs.writeFileSync(dstFile, 'var ' + dst + '=' + JSON.stringify(map, 0, config.format ? 4 : 0) + ';', { encoding: 'utf-8' });
    console.log('map file path:', dstFile);
};

if (config.src) return parse(config.src, config.dst);
fs.readdirSync(config.srcPath).forEach(one => {
    if (/.ply$/.test(one)) {
        parse(one.replace(/.ply$/, ''));
    }
});
