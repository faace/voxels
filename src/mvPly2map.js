(function () {
    var mvPly2Map = {};

    if (typeof window != 'undefined') window.mvPly2Map = mvPly2Map;
    else if (typeof module == 'object') module.exports = mvPly2Map;

    var _getColor = function (r, g, b) {
        r = r.toString(16);
        g = g.toString(16);
        b = b.toString(16);
        if (r.length < 2) r = '0' + r;
        if (g.length < 2) g = '0' + g;
        if (b.length < 2) b = '0' + b;
        return '#' + r + g + b;
    };

    mvPly2Map.parsePly = function (plyText, needHead) {
        var ply = {};
        var idx = plyText.indexOf('end_header');
        ply.data = plyText.substr(idx + 'end_header'.length + 2);
        ply.data = (ply.data.indexOf('\r\n') > 0) ? ply.data.split('\r\n') : ply.data.split('\n');
        if (needHead) {
            throw 'Not support yet';
        }
        return ply;
    };
    mvPly2Map.parse = function (plyText) {
        var ply = this.parsePly(plyText);
        if (!ply.data || ply.data.length < 1) throw 'No data';
        var map = {}, yMap, zMap, a, x, y, z, color;
        ply.data.forEach(one => {
            a = one.trim().split(' ');
            if (a.length == 6) {
                x = parseInt(a[0]);
                y = parseInt(a[2]);
                z = -parseInt(a[1]);
                color = _getColor(parseInt(a[3]), parseInt(a[4]), parseInt(a[5]));

                yMap = map[y];
                if (!yMap) yMap = map[y] = {};

                zMap = yMap[z];
                if (!zMap) zMap = yMap[z] = {};

                // zMap[x] = { color: color };
                zMap[x] = color;

            }
        });

        return map;
    };
    mvPly2Map.getAllColors = function (map) {
        var colors = {}, yMap, zMap;
        for (var y in map) {
            yMap = map[y];
            for (var z in yMap) {
                zMap = yMap[z];
                for (var x in zMap) {
                    colors[zMap[x]] = (colors[zMap[x]] || 0) + 1;
                }
            }
        }
        return colors;
    };
    var _afterAllCallback = function (num, cb) { // 如果有多个回调，设置后，就会在所有回调完再调用最后的一个回调
        var count = 0;
        return function () {
            if (++count >= num) {
                if (cb) {
                    cb();
                    cb = null;
                }
            }
        };
    };
    mvPly2Map.loadPly = function (url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.send();
        xhr.onreadystatechange = function (e) {
            if (xhr.readyState == 4 && xhr.status == 200) {
                callback(xhr.responseText);
            }
        };
    };
    mvPly2Map.loadMap = function (url, callback) {
        this.loadPly(url, function (data) {
            callback(mvPly2Map.parse(data))
        });
    };
    mvPly2Map.loadMaps = function (urls, callback) {
        var arr = [];
        if (Array.isArray(urls)) {
            urls.forEach(function (one) {
                if (typeof one == 'string') {
                    arr.push({
                        name: one.split('/').pop().split('.')[0],
                        url: one
                    });
                } else arr.push(one); // object with name and url
            });
        } else {
            for (var i in urls) arr.push({ name: i, url: urls[i] });
        }

        var idx = 0;
        var realLoad = function () {
            if (idx >= arr.length) return callback(arr);
            this.loadPly(arr[idx].url, function (map) {
                arr[idx].map = mvPly2Map.parse(map);
                idx++;
                realLoad();
            });
        }.bind(this);
        realLoad();
    };
    var _loadPlyFromWeb = function (plys, maps, callback) {
        if (plys.length < 1) return;
        var one = plys.shift();

        mvPly2Map.loadMap(one.src, function (map) {
            var name = one.id || one.src.split('/').pop().split('.').shift();
            maps[name] = map;
            callback();

            _loadPlyFromWeb(plys, maps, callback);
        });
    };
    var _loadPlys = function (cb) {
        var maps = {};
        var codes = document.querySelectorAll('script[type="text/ply"]');
        var callback = _afterAllCallback(codes.length, function () {
            cb && cb(false, maps);
        });
        var plys = [];
        for (var i = 0, one, src, id; i < codes.length; i++) {
            one = codes[i];
            id = one.attributes['id'] && one.attributes['id'].value.trim();
            src = one.attributes['src'] && one.attributes['src'].value.trim();
            if (src) {
                plys.push({ src: src, id: id });
            } else if (id) {
                maps[id] = mvPly2Map.parse(one.innerHTML);
                callback();
            } else {
                throw 'Src code need an id to indentify.';
            }
        }
        _loadPlyFromWeb(plys, maps, callback);
    };
    mvPly2Map.parsePlys = function (cb) {

        if (document.readyState == 'loading') { // 'interactive' || 'complete'
            // load the default scene define in body attribute
            document.addEventListener('DOMContentLoaded', function () {
                document.removeEventListener('DOMContentLoaded', arguments.callee, false);
                _loadPlys(cb);
            }.bind(this), false);
        } else _loadPlys(cb);
    }
    // mvPly2Map.loadPly();
})();