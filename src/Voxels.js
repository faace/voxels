// code: faaceyu
// email: faace.ca@gmail.com

// a cube position
//   7-----6
//  /|    /|
// 3-+---2 |
// | 4---+-5
// |/    |/
// 0-----1

// a face position
// d c
// a b
(function () {
    var Voxels = function (info) {
        this.init(info);
    };

    if (typeof window != 'undefined') window.Voxels = Voxels;
    else if (typeof global != 'undefined') global.Voxels = Voxels;

    if (typeof module != 'undefined' && module.exports) module.exports = Voxels;

    Voxels.prototype.init = function (info) {
        this.info = info;
        this.options = info.options || {};
        this.map = this.copyMap(info.map || {});
        this.textures = this.info.textures || {};
        this.opacities = this.info.opacities || {};
        this.width = info.width || 1;
        this.height = info.height || 1;
        this.depth = info.depth || 1;
        this.cellSize = info.cellSize || -1;
        this.align = info.align;
        this.showFaces = info.showFaces || { front: true, back: true, left: true, right: true, top: true, bottom: true };
        return this;
    };
    Voxels.prototype.run = function (cb) {
        if (!this.bound) this.bound = this.getBound(this.map);
        this.checkCellSize(this.bound);
        if (!this.center) {
            this.center = {};
            this.pCenter = {};
            this.getCenter(this.align, this.center, this.pCenter);
        }
        var vertices = this.buildVertices();
        var faces = this.buildFaces(vertices);

        this.updateVertices(vertices);
        this.updateFaces(vertices, faces);

        this.materials = [];
        this.materialsMap = {};
        this.texturesMap = {};

        var geometry = this.createGeometry(vertices, faces);
        var mesh = new THREE.Mesh(geometry, this.materials);
        cb(false, mesh, this.centerMap(this.map));
    };
    Voxels.prototype.copyMap = function (map) {
        var newMap = {};
        for (var y in map) {
            var yMap = map[y];
            var newYMap = newMap[y] = {};
            for (var z in yMap) {
                var zMap = yMap[z];
                var newZMap = newYMap[z] = {};
                for (var x in zMap) {
                    newZMap[x] = { color: zMap[x] };
                }
            }
        }
        return newMap;
    };
    Voxels.prototype.centerMap = function (map) {
        var newMap = {}, one;
        var opacities = this.opacities;
        var textures = this.textures;
        for (var y in map) {
            var yMap = map[y];
            var newYMap = newMap[y - this.pCenter.y] = {};
            for (var z in yMap) {
                var zMap = yMap[z];
                var newZMap = newYMap[z - this.pCenter.z] = {};
                for (var x in zMap) {
                    one = { color: zMap[x].color };
                    if (opacities[one.color] && opacities[one.color] < 1) one.opacity = opacities[one.color];
                    if (textures[one.color]) one.opacity = textures[one.color];
                    newZMap[x - this.pCenter.x] = one;
                }
            }
        }
        return newMap;
    };
    Voxels.prototype.getMaterial = function (color, s, t) {
        var textures = this.textures;
        var opacity = this.opacities[color];
        var parm = {};
        var material;

        if (this.options.polygonOffset) {
            parm.polygonOffset = true;
            parm.polygonOffsetFactor = this.options.polygonOffsetFactor || -1.0;
            parm.polygonOffsetUnits = this.options.polygonOffsetUnits || -4.0;
        }

        if (textures[color]) { // check where we need to change a special color to a texture
            var tag = textures[color];
            var src;
            if (typeof tag != 'string') src = tag.src;
            else {
                var img = document.querySelector('#' + textures[color]);
                src = img && (img.src || img[0] && img[0].src)
            }
            if (src) {
                var texture = new THREE.TextureLoader().load(src);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(s, t);

                parm.map = texture;
                material = new THREE.MeshBasicMaterial(parm);
                if (typeof opacity != 'undefined') {
                    material.transparent = true;
                    material.opacity = opacity;
                    // m.side = THREE.DoubleSide;
                }
                return material;
            }
        }

        parm.color = color;
        material = new THREE.MeshPhongMaterial(parm);
        if (typeof opacity != 'undefined') {
            material.transparent = true;
            material.opacity = opacity;
            // m.side = THREE.DoubleSide;
        }
        return material;
    };
    Voxels.prototype.getMaterialIdx = function (color, s, t) {
        // var color = material.color;
        var tag = color + '_' + s + '_' + t;
        if (typeof this.materialsMap[tag] == 'undefined') {
            var m = this.getMaterial(color, s, t);
            this.materialsMap[tag] = this.materials.length;
            this.materials.push(m);
        }
        return this.materialsMap[tag];
    };

    Voxels.prototype.createGeometry = function (vertices, faces) {
        var geometry = new THREE.Geometry();
        for (var i = 0; i < vertices.length; i++) {
            if (vertices[i][3]) {
                geometry.vertices.push(new THREE.Vector3(vertices[i][0], vertices[i][1], vertices[i][2]));
            }
        }
        geometry.computeBoundingBox();

        var faceVertexUv = geometry.faceVertexUvs[0];
        var t0 = new THREE.Vector2(0, 0);
        var t1 = new THREE.Vector2(1, 0);
        var t2 = new THREE.Vector2(1, 1);
        var t3 = new THREE.Vector2(0, 1);
        var uv1 = [t0, t1, t2];
        var uv2 = [t0, t2, t3];
        for (var i = 0, face, idx; i < faces.length; i++) {
            face = faces[i];
            idx = this.getMaterialIdx(face[3].color, face[4], face[5]);
            geometry.faces.push(new THREE.Face3(face[0], face[1], face[2], undefined, undefined, idx));
            faceVertexUv.push(uv1, uv2);
        }
        // geometry.mergeVertices();
        geometry.computeFaceNormals();
        return geometry;
    };
    Voxels.prototype.updateFaces = function (vertices, faces) { // update the faces with new vertices index
        for (var i = 0; i < faces.length; i++) {
            faces[i][0] = vertices[faces[i][0]][4];
            faces[i][1] = vertices[faces[i][1]][4];
            faces[i][2] = vertices[faces[i][2]][4];
        }
    };
    Voxels.prototype.updateVertices = function (vertices) { // mark all the used vertices so that we can remove those unused later.
        var idx = 0;
        for (var i = 0; i < vertices.length; i++) {
            if (vertices[i][3]) vertices[i][4] = idx++;
        }
    };
    Voxels.prototype.isSameMaterial = function (map, x, y, z, color) { // check where there are the same material
        if (map[y] && map[y][z] && typeof map[y][z][x] != 'undefined') {
            if (map[y][z][x] === color) return true;
        }
        return false
    };
    Voxels.prototype.FindAndSetPointBottom = function (bound, map, x, y, z, to) {// 查找同一面的右下角定点和右上角定点
        var face = 'bottom';
        var xx, yy, zz;
        var material = map[y][z][x];
        var noSame;
        to.x = x; to.y = y; to.z = z;
        for (xx = x; xx <= bound.maxX; xx++) { // facing the bottom, left to right and mark
            if (this.canIgnore(map, xx, y, z, xx, y - 1, z)) break;
            if (this.isSameMaterial(map, xx, y, z, material) && !map[y][z][xx][face]) {
                map[y][z][xx][face] = true;
                to.x = xx;
            } else break;
        }
        for (zz = z + 1; zz <= bound.maxZ; zz++) {
            noSame = false;
            for (xx = x; xx <= to.x; xx++) { // bottom to up
                if (this.canIgnore(map, xx, y, zz, xx, y - 1, zz) || !this.isSameMaterial(map, xx, y, zz, material) || map[y][zz][xx][face]) {
                    noSame = true;
                    break;
                }
            }
            if (noSame) break;
            for (xx = x; xx <= to.x; xx++) { // mark
                map[y][zz][xx][face] = true;
            }
            to.z = zz;
        }
    };
    Voxels.prototype.FindAndSetPointTop = function (bound, map, x, y, z, to) {// 查找同一面的右下角定点和右上角定点
        var face = 'top';
        var xx, yy, zz;
        var material = map[y][z][x];
        var noSame;
        to.x = x; to.y = y; to.z = z;
        for (xx = x; xx <= bound.maxX; xx++) { // facing the top, left to right and mark
            if (this.canIgnore(map, xx, y, z, xx, y + 1, z)) break;
            if (this.isSameMaterial(map, xx, y, z, material) && !map[y][z][xx][face]) {
                map[y][z][xx][face] = true;
                to.x = xx;
            } else break;
        }
        for (zz = z - 1; zz >= bound.minZ; zz--) {
            noSame = false;
            for (xx = x; xx <= to.x; xx++) { // bottom to up
                if (this.canIgnore(map, xx, y, zz, xx, y + 1, zz) || !this.isSameMaterial(map, xx, y, zz, material) || map[y][zz][xx][face]) {
                    noSame = true;
                    break;
                }
            }
            if (noSame) break;
            for (xx = x; xx <= to.x; xx++) { // mark
                map[y][zz][xx][face] = true;
            }
            to.z = zz;
        }
    };

    Voxels.prototype.FindAndSetPointRight = function (bound, map, x, y, z, to) {// 查找同一面的右下角定点和右上角定点
        var face = 'right';
        var xx, yy, zz;
        var material = map[y][z][x];
        var noSame;
        to.x = x; to.y = y; to.z = z;
        for (zz = z; zz >= bound.minZ; zz--) { // facing the rgiht, left to right and mark
            if (this.canIgnore(map, x, y, zz, x + 1, y, zz)) break;
            if (this.isSameMaterial(map, x, y, zz, material) && !map[y][zz][x][face]) {
                map[y][zz][x][face] = true;
                to.z = zz;
            } else break;
        }
        for (yy = y + 1; yy <= bound.maxY; yy++) {
            noSame = false;
            for (zz = z; zz >= to.z; zz--) { // bottom to up
                if (this.canIgnore(map, x, yy, zz, x + 1, yy, zz) || !this.isSameMaterial(map, x, yy, zz, material) || map[yy][zz][x][face]) {
                    noSame = true;
                    break;
                }
            }
            if (noSame) break;
            for (zz = z; zz >= to.z; zz--) { // mark
                map[yy][zz][x][face] = true;
            }
            to.y = yy;
        }
    };
    Voxels.prototype.FindAndSetPointLeft = function (bound, map, x, y, z, to) {// 查找同一面的右下角定点和右上角定点
        var face = 'left';
        var xx, yy, zz;
        var material = map[y][z][x];
        var noSame;
        to.x = x; to.y = y; to.z = z;
        for (zz = z; zz <= bound.maxZ; zz++) { // facing the left, left to right and mark
            if (this.canIgnore(map, x, y, zz, x - 1, y, zz)) break;
            if (this.isSameMaterial(map, x, y, zz, material) && !map[y][zz][x][face]) {
                map[y][zz][x][face] = true;
                to.z = zz;
            } else break;
        }
        for (yy = y + 1; yy <= bound.maxY; yy++) {
            noSame = false;
            for (zz = z; zz <= to.z; zz++) { // bottom to up
                if (this.canIgnore(map, x, yy, zz, x - 1, yy, zz) || !this.isSameMaterial(map, x, yy, zz, material) || map[yy][zz][x][face]) {
                    noSame = true;
                    break;
                }
            }
            if (noSame) break;
            for (zz = z; zz <= to.z; zz++) { // mark
                map[yy][zz][x][face] = true;
            }
            to.y = yy;
        }
    };

    Voxels.prototype.FindAndSetPointBack = function (bound, map, x, y, z, to) { // find from left-bottom to right-top in back face
        var face = 'back';
        var xx, yy, zz;
        var material = map[y][z][x];
        var noSame;
        to.x = x; to.y = y; to.z = z;
        for (xx = x; xx >= bound.minX; xx--) { // facing the back, left to right and mark
            if (this.canIgnore(map, xx, y, z, xx, y, z - 1)) break;
            if (this.isSameMaterial(map, xx, y, z, material) && !map[y][z][xx][face]) {
                map[y][z][xx][face] = true;
                to.x = xx;
            } else break;
        }
        for (yy = y + 1; yy <= bound.maxY; yy++) {
            noSame = false;
            for (xx = x; xx >= to.x; xx--) { // bottom to up
                if (this.canIgnore(map, xx, yy, z, xx, yy, z - 1) || !this.isSameMaterial(map, xx, yy, z, material) || map[yy][z][xx][face]) {
                    noSame = true;
                    break;
                }
            }
            if (noSame) break;
            for (xx = x; xx >= to.x; xx--) { // mark
                map[yy][z][xx][face] = true;
            }
            to.y = yy;
        }
    };
    Voxels.prototype.FindAndSetPointFront = function (bound, map, x, y, z, to) { // find from left-bottom to right-top in front face
        var face = 'front';
        var xx, yy, zz;
        var material = map[y][z][x];
        var noSame;
        to.x = x; to.y = y; to.z = z;
        for (xx = x; xx <= bound.maxX; xx++) { // facing the front, left to right and mark
            if (this.canIgnore(map, xx, y, z, xx, y, z + 1)) break;
            if (this.isSameMaterial(map, xx, y, z, material) && !map[y][z][xx][face]) {
                map[y][z][xx][face] = true;
                to.x = xx;
            } else break;
        }
        for (yy = y + 1; yy <= bound.maxY; yy++) {
            noSame = false;
            for (xx = x; xx <= to.x; xx++) { // bottom to up
                if (this.canIgnore(map, xx, yy, z, xx, yy, z + 1) || !this.isSameMaterial(map, xx, yy, z, material) || map[yy][z][xx][face]) {
                    noSame = true;
                    break;
                }
            }
            if (noSame) break;
            for (xx = x; xx <= to.x; xx++) { // mark
                map[yy][z][xx][face] = true;
            }
            to.y = yy;
        }
    };
    Voxels.prototype.canIgnore = function (map, sx, sy, sz, x, y, z) {
        if (!map[sy] || !map[sy][sz] || typeof map[sy][sz][sx] == 'undefined') return true;
        if (map[y] && map[y][z] && typeof map[y][z][x] != 'undefined') {
            if (map[sy][sz][sx].color == map[y][z][x].color) return true;
        }
        // return (map[y] && map[y][z] && map[y][z][x] && (typeof map[y][z][x].opacity == 'undefined' || map[y][z][x].opacity >= 1));
        return false;
    };
    Voxels.prototype.getPointIdx = function (bound, x, y, z) { // get the first index(index 0 of the cube) of a point
        var yy = y - bound.minY;
        var zz = z - bound.minZ;
        var xx = x - bound.minX;

        var idx = yy * bound.width * bound.depth;
        idx += zz * bound.width;
        idx += xx;
        return idx * 8;
    };
    Voxels.prototype.buildAFace = function (faces, a, b, c, d, vertices, color, s, t) { // build a rect face with 2 tree triangle faces and mark the associated points
        // d c
        // a b
        faces.push([a, b, c, color, s, t]);
        faces.push([a, c, d, color, s, t]);
        vertices[a][3]++;
        vertices[b][3]++;
        vertices[c][3]++;
        vertices[d][3]++;
    };
    Voxels.prototype.buildFaces = function (vertices) { // build all the faces, each index of the faces is the orginal one which will be updated later
        var bound = this.bound;
        var map = this.map;
        var faces = [];
        var y, z, x;
        var to = { x: 0, y: 0, z: 0 };
        var pointA, pointB, pointC, pointD;

        if (this.showFaces.front) { // front
            for (y = bound.minY; y <= bound.maxY; y++) {
                if (!map[y]) continue;
                for (z = bound.maxZ; z >= bound.minZ; z--) {
                    if (!map[y][z]) continue;
                    for (x = bound.minX; x <= bound.maxX; x++) {
                        if (!map[y][z][x]) continue; // no need to handle if it is a empty block
                        if (this.canIgnore(map, x, y, z, x, y, z + 1)) continue; // no need to handle if it is a middle one
                        if (!map[y][z][x].front) {
                            this.FindAndSetPointFront(bound, map, x, y, z, to);
                            pointA = this.getPointIdx(bound, x, y, z);
                            pointB = this.getPointIdx(bound, to.x, y, z);
                            pointC = this.getPointIdx(bound, to.x, to.y, z);
                            pointD = this.getPointIdx(bound, x, to.y, z);
                            this.buildAFace(faces, pointA, pointB + 1, pointC + 2, pointD + 3, vertices, map[y][z][x], Math.abs(x - to.x) + 1, Math.abs(y - to.y) + 1);
                        };
                    }
                }
            }
        }
        if (this.showFaces.back) { // back
            for (y = bound.minY; y <= bound.maxY; y++) {
                if (!map[y]) continue;
                for (z = bound.minZ; z <= bound.maxZ; z++) {
                    if (!map[y][z]) continue;
                    for (x = bound.maxX; x >= bound.minX; x--) {
                        if (!map[y][z][x]) continue; // no need to handle if it is a empty block
                        if (this.canIgnore(map, x, y, z, x, y, z - 1)) continue; // no need to handle if it is a middle one
                        if (!map[y][z][x].back) {
                            this.FindAndSetPointBack(bound, map, x, y, z, to);
                            pointA = this.getPointIdx(bound, x, y, z);
                            pointB = this.getPointIdx(bound, to.x, y, z);
                            pointC = this.getPointIdx(bound, to.x, to.y, z);
                            pointD = this.getPointIdx(bound, x, to.y, z);
                            this.buildAFace(faces, pointA + 5, pointB + 4, pointC + 7, pointD + 6, vertices, map[y][z][x], Math.abs(x - to.x) + 1, Math.abs(y - to.y) + 1);
                        };
                    }
                }
            }
        }
        if (this.showFaces.left) { // left
            for (y = bound.minY; y <= bound.maxY; y++) {
                if (!map[y]) continue;
                for (z = bound.minZ; z <= bound.maxZ; z++) {
                    if (!map[y][z]) continue;
                    for (x = bound.minX; x <= bound.maxX; x++) {
                        if (!map[y][z][x]) continue; // no need to handle if it is a empty block
                        if (this.canIgnore(map, x, y, z, x - 1, y, z)) continue; // no need to handle if it is a middle one
                        if (!map[y][z][x].left) {
                            this.FindAndSetPointLeft(bound, map, x, y, z, to);
                            pointA = this.getPointIdx(bound, x, y, z);
                            pointB = this.getPointIdx(bound, x, y, to.z);
                            pointC = this.getPointIdx(bound, x, to.y, to.z);
                            pointD = this.getPointIdx(bound, x, to.y, z);
                            this.buildAFace(faces, pointA + 4, pointB, pointC + 3, pointD + 7, vertices, map[y][z][x], Math.abs(z - to.z) + 1, Math.abs(y - to.y) + 1);
                        };
                    }
                }
            }
        }
        if (this.showFaces.right) { // right
            for (y = bound.minY; y <= bound.maxY; y++) {
                if (!map[y]) continue;
                for (z = bound.maxZ; z >= bound.minZ; z--) {
                    if (!map[y][z]) continue;
                    for (x = bound.maxX; x >= bound.minX; x--) {
                        if (!map[y][z][x]) continue; // no need to handle if it is a empty block
                        if (this.canIgnore(map, x, y, z, x + 1, y, z)) continue; // no need to handle if it is a middle one
                        if (!map[y][z][x].right) {
                            this.FindAndSetPointRight(bound, map, x, y, z, to);
                            pointA = this.getPointIdx(bound, x, y, z);
                            pointB = this.getPointIdx(bound, x, y, to.z);
                            pointC = this.getPointIdx(bound, x, to.y, to.z);
                            pointD = this.getPointIdx(bound, x, to.y, z);
                            this.buildAFace(faces, pointA + 1, pointB + 5, pointC + 6, pointD + 2, vertices, map[y][z][x], Math.abs(z - to.z) + 1, Math.abs(y - to.y) + 1);
                        };
                    }
                }
            }
        }
        if (this.showFaces.top) { // top
            for (y = bound.maxY; y >= bound.minY; y--) {
                if (!map[y]) continue;
                for (z = bound.maxZ; z >= bound.minZ; z--) {
                    if (!map[y][z]) continue;
                    for (x = bound.minX; x <= bound.maxX; x++) {
                        if (!map[y][z][x]) continue; // no need to handle if it is a empty block
                        if (this.canIgnore(map, x, y, z, x, y + 1, z)) continue; // no need to handle if it is a middle one
                        if (!map[y][z][x].top) {
                            this.FindAndSetPointTop(bound, map, x, y, z, to);
                            pointA = this.getPointIdx(bound, x, y, z);
                            pointB = this.getPointIdx(bound, to.x, y, z);
                            pointC = this.getPointIdx(bound, to.x, y, to.z);
                            pointD = this.getPointIdx(bound, x, y, to.z);
                            this.buildAFace(faces, pointA + 3, pointB + 2, pointC + 6, pointD + 7, vertices, map[y][z][x], Math.abs(x - to.x) + 1, Math.abs(z - to.z) + 1);
                        };
                    }
                }
            }
        }
        if (this.showFaces.bottom) { // bottom
            for (y = bound.minY; y <= bound.maxY; y++) {
                if (!map[y]) continue;
                for (z = bound.minZ; z <= bound.maxZ; z++) {
                    if (!map[y][z]) continue;
                    for (x = bound.minX; x <= bound.maxX; x++) {
                        if (!map[y][z][x]) continue; // no need to handle if it is a empty block
                        if (this.canIgnore(map, x, y, z, x, y - 1, z)) continue; // no need to handle if it is a middle one
                        if (!map[y][z][x].bottom) {
                            this.FindAndSetPointBottom(bound, map, x, y, z, to);
                            pointA = this.getPointIdx(bound, x, y, z);
                            pointB = this.getPointIdx(bound, to.x, y, z);
                            pointC = this.getPointIdx(bound, to.x, y, to.z);
                            pointD = this.getPointIdx(bound, x, y, to.z);
                            this.buildAFace(faces, pointA + 4, pointB + 5, pointC + 1, pointD + 0, vertices, map[y][z][x], Math.abs(x - to.x) + 1, Math.abs(z - to.z) + 1);
                        };
                    }
                }
            }
        }

        return faces;
    };
    Voxels.prototype.buildVertices = function () { // record all points including all used and unused
        var bound = this.bound;
        var width = this.width;
        var height = this.height;
        var depth = this.depth;
        var center = this.center;

        var vertices = [], idx = 0;
        var y, z, x;
        var tx, ty, tz;
        var w2 = width * 0.5;
        var h2 = height * 0.5;
        var d2 = depth * 0.5;
        for (y = bound.minY; y <= bound.maxY; y++) {
            for (z = bound.minZ; z <= bound.maxZ; z++) {
                for (x = bound.minX; x <= bound.maxX; x++) {
                    tx = -center.x + x * width;
                    ty = -center.y + y * height;
                    tz = -center.z + z * depth;
                    vertices.push([tx - w2, ty - h2, tz + d2, 0, idx++]); // 0 // x, y, z, usedTimes, final idx
                    vertices.push([tx + w2, ty - h2, tz + d2, 0, idx++]); // 1
                    vertices.push([tx + w2, ty + h2, tz + d2, 0, idx++]); // 2
                    vertices.push([tx - w2, ty + h2, tz + d2, 0, idx++]); // 3
                    vertices.push([tx - w2, ty - h2, tz - d2, 0, idx++]); // 4
                    vertices.push([tx + w2, ty - h2, tz - d2, 0, idx++]); // 5
                    vertices.push([tx + w2, ty + h2, tz - d2, 0, idx++]); // 6
                    vertices.push([tx - w2, ty + h2, tz - d2, 0, idx++]); // 7
                }
            }
        }
        return vertices;
    };
    Voxels.prototype.getCenter2 = function (min, max, step, scale) {
        return min * step + (max - min) * step * scale;
        // return min + scale * (max - min) * step;
    };
    Voxels.prototype.getCenter = function (align, center, pCenter) {
        var bound = this.bound;
        var width = this.width;
        var height = this.height;
        var depth = this.depth;
        var scaleX, scaleY, scaleZ;
        var paddingX, paddingY, paddingZ;
        if (typeof align == 'undefined') align = 'center';
        if (typeof align == 'string') {
            align = align.trim();
            aligns = align.split(' ');
            if (aligns.length == 3) { // different in three direct
                if (aligns[0] == 'left') {
                    scaleX = 0;
                    paddingX = -0.5;
                    pCenter.x = bound.minX;
                } else if (aligns[0] == 'right') {
                    scaleX = 1;
                    paddingX = 0.5;
                    pCenter.x = bound.maxX;
                } else { // center
                    scaleX = 0.5;
                    paddingX = 0;
                    pCenter.x = bound.minX + Math.floor(0.5 * (bound.maxX - bound.minX));
                }
                if (aligns[1] == 'bottom') {
                    scaleY = 0;
                    paddingY = -0.5;
                    pCenter.y = bound.minY;
                } else if (aligns[1] == 'top') {
                    scaleY = 1;
                    paddingY = 0.5;
                    pCenter.y = bound.maxY;
                } else { // center
                    scaleY = 0.5;
                    paddingY = 0;
                    pCenter.y = bound.minY + Math.floor(0.5 * (bound.maxY - bound.minY));
                }
                if (aligns[2] == 'back') {
                    scaleZ = 0;
                    paddingZ = -0.5;
                    pCenter.z = bound.minZ;
                } else if (aligns[2] == 'front') {
                    scaleZ = 1;
                    paddingZ = 0.5;
                    pCenter.z = bound.maxZ;
                } else { // center
                    scaleZ = 0.5;
                    paddingZ = 0;
                    pCenter.z = bound.minZ + Math.floor(0.5 * (bound.maxZ - bound.minZ));
                }
            } else { // same in three direct
                if (align == 'left') {
                    scaleX = scaleY = scaleZ = 0;
                    paddingX = paddingY = paddingZ = -0.5;
                    pCenter.x = bound.minX;
                    pCenter.y = bound.minY;
                    pCenter.z = bound.minZ;
                } else if (align == 'right') {
                    scaleX = scaleY = scaleZ = 1;
                    paddingX = paddingY = paddingZ = 0.5;
                    pCenter.x = bound.maxX;
                    pCenter.y = bound.maxY;
                    pCenter.z = bound.maxZ;
                } else { // center
                    scaleX = scaleY = scaleZ = 0.5;
                    paddingX = paddingY = paddingZ = 0;
                    pCenter.x = bound.minX + Math.floor(0.5 * (bound.maxX - bound.minX));
                    pCenter.y = bound.minY + Math.floor(0.5 * (bound.maxY - bound.minY));
                    pCenter.z = bound.minZ + Math.floor(0.5 * (bound.maxZ - bound.minZ));
                }
            }
            // console.log(paddingZ, scaleZ);
            center.x = this.getCenter2(bound.minX, bound.maxX, width, scaleX) + paddingX * width;
            center.y = this.getCenter2(bound.minY, bound.maxY, height, scaleY) + paddingY * height;
            center.z = this.getCenter2(bound.minZ, bound.maxZ, depth, scaleZ) + paddingZ * depth;
        } else {
            center.x = align.x;
            center.y = align.y;
            center.z = align.z;
        }
        return center;
    };
    Voxels.prototype.checkCellSize = function (bound) {
        if (this.cellSize > 0) {
            this.width = this.depth = this.height = this.cellSize / Math.max((bound.maxX - bound.minX + 1), (bound.maxZ - bound.minZ + 1));
        }
    };
    Voxels.prototype.getBound = function (map) { // caculate the bound of the blocks
        var minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity, minX = Infinity, maxX = -Infinity;
        var y, z, x, map2, map3;
        for (y in map) {
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            map2 = map[y];
            for (z in map2) {
                minZ = Math.min(minZ, z);
                maxZ = Math.max(maxZ, z);
                map3 = map2[z];
                for (x in map3) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                }
            }
        }
        return { minY: minY, maxY: maxY, minZ: minZ, maxZ: maxZ, minX: minX, maxX: maxX, width: maxX - minX + 1, height: maxY - minY + 1, depth: maxZ - minZ + 1 };
    };
})();