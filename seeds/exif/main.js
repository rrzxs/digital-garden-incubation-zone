(function () {
    var uploadZone = document.getElementById('upload-zone');
    var fileInput = document.getElementById('file-input');
    var resultPanel = document.getElementById('result-panel');
    var previewImg = document.getElementById('preview-img');
    var metaScroll = document.getElementById('meta-scroll');
    var toastEl = document.getElementById('toast');
    var copyAllBtn = document.getElementById('copy-all-btn');
    var resetBtn = document.getElementById('reset-btn');
    var themeToggleBtn = document.getElementById('theme-toggle-btn');
    var scanModeBtn = document.getElementById('btn-scan-mode');
    var scanBeam = document.getElementById('scan-beam');
    var scanLine = document.getElementById('scan-line');
    var lensFlare = document.getElementById('lens-flare');
    var previewInfoBar = document.getElementById('preview-info-bar');
    var uploadParticles = document.getElementById('upload-particles');

    var btnViewImage = document.getElementById('btn-view-image');
    var btnViewHistogram = document.getElementById('btn-view-histogram');
    var btnViewLocation = document.getElementById('btn-view-location');
    var btnViewColor = document.getElementById('btn-view-color');
    var imagePreview = document.getElementById('image-preview');
    var histogramCanvas = document.getElementById('histogram-canvas');
    var locationView = document.getElementById('location-view');
    var colorView = document.getElementById('color-view');

    var themes = ['', 'warm', 'emerald', 'rose'];
    var currentThemeIndex = 0;
    var currentMetadata = null;
    var scanModeEnabled = false;
    var particleAnimFrame = null;

    var EXIF_TAG_NAMES = {
        0x010f: 'Make', 0x0110: 'Model', 0x0112: 'Orientation',
        0x011a: 'XResolution', 0x011b: 'YResolution', 0x0128: 'ResolutionUnit',
        0x0131: 'Software', 0x0132: 'DateTime', 0x013b: 'Artist',
        0x0213: 'YCbCrPositioning', 0x8298: 'Copyright',
        0x8769: 'ExifIFDPointer', 0x8825: 'GPSInfoIFDPointer',
    };

    var EXIF_SUB_TAG_NAMES = {
        0x829a: 'ExposureTime', 0x829d: 'FNumber', 0x8822: 'ExposureProgram',
        0x8827: 'ISOSpeedRatings', 0x9000: 'ExifVersion',
        0x9003: 'DateTimeOriginal', 0x9004: 'DateTimeDigitized',
        0x9201: 'ShutterSpeedValue', 0x9202: 'ApertureValue',
        0x9204: 'ExposureBiasValue', 0x9205: 'MaxApertureValue',
        0x9207: 'MeteringMode', 0x9209: 'Flash', 0x920a: 'FocalLength',
        0xa001: 'ColorSpace', 0xa002: 'PixelXDimension', 0xa003: 'PixelYDimension',
        0xa005: 'ExifInteroperabilityOffset', 0xa217: 'SensingMethod',
        0xa300: 'FileSource', 0xa301: 'SceneType',
        0xa405: 'FocalLengthIn35mmFilm', 0xa432: 'LensInfo',
        0xa433: 'LensMake', 0xa434: 'LensModel', 0xa435: 'LensSerialNumber',
    };

    var GPS_TAG_NAMES = {
        0x0001: 'GPSLatitudeRef', 0x0002: 'GPSLatitude',
        0x0003: 'GPSLongitudeRef', 0x0004: 'GPSLongitude',
        0x0005: 'GPSAltitudeRef', 0x0006: 'GPSAltitude',
        0x0007: 'GPSTimeStamp', 0x001d: 'GPSDateStamp',
    };

    function getString(dataView, offset, length) {
        var str = '';
        for (var i = 0; i < length; i++) {
            var ch = dataView.getUint8(offset + i);
            if (ch === 0) break;
            str += String.fromCharCode(ch);
        }
        return str.trim();
    }

    function getRational(dataView, offset, le) {
        var num = dataView.getUint32(offset, le);
        var den = dataView.getUint32(offset + 4, le);
        return den === 0 ? 0 : num / den;
    }

    function getSRational(dataView, offset, le) {
        var num = dataView.getInt32(offset, le);
        var den = dataView.getInt32(offset + 4, le);
        return den === 0 ? 0 : num / den;
    }

    function readTagValue(dataView, offset, type, count, le) {
        var TYPES = {
            1: { size: 1 }, 2: { size: 1 }, 3: { size: 2 }, 4: { size: 4 },
            5: { size: 8 }, 7: { size: 1 }, 9: { size: 4 }, 10: { size: 8 },
        };
        var info = TYPES[type];
        if (!info) return null;
        var totalSize = info.size * count;
        var valOff = offset + 8;
        if (totalSize > 4) valOff = dataView.getUint32(offset + 8, le);

        if (type === 2) return getString(dataView, valOff, count);
        if (type === 3) {
            if (count === 1) return dataView.getUint16(valOff, le);
            var a = [];
            for (var i = 0; i < count; i++) a.push(dataView.getUint16(valOff + i * 2, le));
            return a;
        }
        if (type === 4) {
            if (count === 1) return dataView.getUint32(valOff, le);
            var b = [];
            for (var j = 0; j < count; j++) b.push(dataView.getUint32(valOff + j * 4, le));
            return b;
        }
        if (type === 5) {
            if (count === 1) return getRational(dataView, valOff, le);
            var c = [];
            for (var k = 0; k < count; k++) c.push(getRational(dataView, valOff + k * 8, le));
            return c;
        }
        if (type === 10) {
            if (count === 1) return getSRational(dataView, valOff, le);
            var d = [];
            for (var m = 0; m < count; m++) d.push(getSRational(dataView, valOff + m * 8, le));
            return d;
        }
        if (type === 1 || type === 7) {
            if (count === 1) return dataView.getUint8(valOff);
            var e = [];
            for (var n = 0; n < count; n++) e.push(dataView.getUint8(valOff + n));
            return e;
        }
        if (type === 9) {
            if (count === 1) return dataView.getInt32(valOff, le);
            var f = [];
            for (var p = 0; p < count; p++) f.push(dataView.getInt32(valOff + p * 4, le));
            return f;
        }
        return null;
    }

    function parseIFD(dataView, ifdOffset, tagNames, le, result) {
        if (ifdOffset + 2 > dataView.byteLength) return;
        var count = dataView.getUint16(ifdOffset, le);
        for (var i = 0; i < count; i++) {
            var off = ifdOffset + 2 + i * 12;
            if (off + 12 > dataView.byteLength) break;
            var tag = dataView.getUint16(off, le);
            var type = dataView.getUint16(off + 2, le);
            var cnt = dataView.getUint32(off + 4, le);
            var name = tagNames[tag] || ('Unknown_0x' + tag.toString(16).padStart(4, '0'));
            var val = readTagValue(dataView, off, type, cnt, le);
            if (val !== null) result[name] = val;
        }
    }

    function parseExif(buffer) {
        var dv = new DataView(buffer);
        var result = { file: {}, exif: {}, gps: {} };
        if (dv.getUint16(0) !== 0xFFD8) return result;

        var offset = 2;
        while (offset < dv.byteLength) {
            if (dv.getUint8(offset) !== 0xFF) break;
            var marker = dv.getUint8(offset + 1);
            if (marker === 0xE1) {
                var segLen = dv.getUint16(offset + 2);
                var header = getString(dv, offset + 4, 4);
                if (header !== 'Exif') break;

                var tiffOff = offset + 10;
                var le = dv.getUint16(tiffOff) === 0x4949;
                if (dv.getUint16(tiffOff + 2, le) !== 0x002A) break;
                var ifdOff = dv.getUint32(tiffOff + 4, le);

                var ifd0 = {};
                parseIFD(dv, tiffOff + ifdOff, EXIF_TAG_NAMES, le, ifd0);

                if (ifd0.Make) result.exif.Make = ifd0.Make;
                if (ifd0.Model) result.exif.Model = ifd0.Model;
                if (ifd0.Orientation) result.exif.Orientation = ifd0.Orientation;
                if (ifd0.DateTime) result.exif.DateTime = ifd0.DateTime;
                if (ifd0.Software) result.exif.Software = ifd0.Software;
                if (ifd0.Copyright) result.exif.Copyright = ifd0.Copyright;
                if (ifd0.Artist) result.exif.Artist = ifd0.Artist;
                if (ifd0.XResolution) result.exif.XResolution = ifd0.XResolution;
                if (ifd0.YResolution) result.exif.YResolution = ifd0.YResolution;

                if (ifd0.ExifIFDPointer) {
                    var sub = {};
                    parseIFD(dv, tiffOff + ifd0.ExifIFDPointer, EXIF_SUB_TAG_NAMES, le, sub);
                    if (sub.ExposureTime !== undefined) result.exif.ExposureTime = sub.ExposureTime;
                    if (sub.FNumber !== undefined) result.exif.FNumber = sub.FNumber;
                    if (sub.ISOSpeedRatings !== undefined) result.exif.ISO = Array.isArray(sub.ISOSpeedRatings) ? sub.ISOSpeedRatings[0] : sub.ISOSpeedRatings;
                    if (sub.FocalLength !== undefined) result.exif.FocalLength = sub.FocalLength;
                    if (sub.FocalLengthIn35mmFilm) result.exif.FocalLength35mm = sub.FocalLengthIn35mmFilm;
                    if (sub.Flash !== undefined) result.exif.Flash = sub.Flash;
                    if (sub.ExposureProgram !== undefined) result.exif.ExposureProgram = sub.ExposureProgram;
                    if (sub.MeteringMode !== undefined) result.exif.MeteringMode = sub.MeteringMode;
                    if (sub.ColorSpace !== undefined) result.exif.ColorSpace = sub.ColorSpace;
                    if (sub.DateTimeOriginal) result.exif.DateTimeOriginal = sub.DateTimeOriginal;
                    if (sub.DateTimeDigitized) result.exif.DateTimeDigitized = sub.DateTimeDigitized;
                    if (sub.ExposureBiasValue !== undefined) result.exif.ExposureBias = sub.ExposureBiasValue;
                    if (sub.MaxApertureValue !== undefined) result.exif.MaxAperture = sub.MaxApertureValue;
                    if (sub.LensModel) result.exif.LensModel = sub.LensModel;
                    if (sub.LensMake) result.exif.LensMake = sub.LensMake;
                    if (sub.LensInfo) result.exif.LensInfo = sub.LensInfo;
                    if (sub.PixelXDimension) result.exif.PixelXDimension = sub.PixelXDimension;
                    if (sub.PixelYDimension) result.exif.PixelYDimension = sub.PixelYDimension;
                }

                if (ifd0.GPSInfoIFDPointer) {
                    var gps = {};
                    parseIFD(dv, tiffOff + ifd0.GPSInfoIFDPointer, GPS_TAG_NAMES, le, gps);
                    if (gps.GPSLatitude && gps.GPSLatitudeRef) {
                        result.gps.latitude = dmsToDecimal(gps.GPSLatitude, gps.GPSLatitudeRef);
                        result.gps.latitudeRef = gps.GPSLatitudeRef;
                    }
                    if (gps.GPSLongitude && gps.GPSLongitudeRef) {
                        result.gps.longitude = dmsToDecimal(gps.GPSLongitude, gps.GPSLongitudeRef);
                        result.gps.longitudeRef = gps.GPSLongitudeRef;
                    }
                    if (gps.GPSAltitude !== undefined) result.gps.altitude = gps.GPSAltitude;
                }
                break;
            }
            if (marker === 0xD9 || marker === 0xDA || marker === 0x00 || marker === 0xFF) break;
            offset += 2 + dv.getUint16(offset + 2);
        }
        return result;
    }

    function dmsToDecimal(dms, ref) {
        if (!Array.isArray(dms) || dms.length < 3) return null;
        var dec = dms[0] + dms[1] / 60 + dms[2] / 3600;
        if (ref === 'S' || ref === 'W') dec = -dec;
        return dec;
    }

    function formatExposureTime(v) {
        if (v === undefined || v === null) return null;
        if (v >= 1) return v.toFixed(1) + 's';
        if (v >= 0.1) return v.toFixed(2) + 's';
        return '1/' + Math.round(1 / v) + 's';
    }

    function formatFNumber(v) {
        if (v === undefined || v === null) return null;
        return 'f/' + v.toFixed(1);
    }

    function formatFocalLength(v) {
        if (v === undefined || v === null) return null;
        return v.toFixed(1) + 'mm';
    }

    function formatFlash(v) {
        if (v === undefined || v === null) return null;
        var fired = v & 0x01;
        var mode = (v >> 3) & 0x03;
        var modes = ['', '(强制)', '(抑制)', '(自动)'];
        return (fired ? '闪光' : '未闪光') + (modes[mode] || '');
    }

    function formatExposureProgram(v) {
        var map = { 0: '未定义', 1: '手动', 2: '程序自动', 3: '光圈优先', 4: '快门优先', 5: '创意程序', 6: '动作程序', 7: '人像', 8: '风景' };
        return map[v] || v;
    }

    function formatMeteringMode(v) {
        var map = { 0: '未知', 1: '平均', 2: '中央重点', 3: '点测光', 4: '多点测光', 5: '矩阵测光', 6: '局部测光' };
        return map[v] || v;
    }

    function formatColorSpace(v) { return v === 1 ? 'sRGB' : v === 0xFFFF ? 'Uncalibrated' : v; }

    function formatExposureBias(v) {
        if (v === undefined || v === null) return null;
        return (v > 0 ? '+' : '') + v.toFixed(1) + ' EV';
    }

    function formatOrientation(v) {
        var map = {
            1: '水平(正常)', 2: '水平翻转', 3: '旋转 180°', 4: '垂直翻转',
            5: '顺时针 90° + 水平翻转', 6: '顺时针 90°', 7: '逆时针 90° + 水平翻转', 8: '逆时针 90°'
        };
        return map[v] || String(v);
    }

    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('visible');
        clearTimeout(showToast._t);
        showToast._t = setTimeout(function () { toastEl.classList.remove('visible'); }, 2800);
    }

    function spawnUploadParticles() {
        uploadParticles.innerHTML = '';
        for (var i = 0; i < 20; i++) {
            var p = document.createElement('div');
            p.className = 'upload-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDelay = (Math.random() * 3) + 's';
            p.style.animationDuration = (3 + Math.random() * 4) + 's';
            p.style.animation = 'particleFloat ' + (3 + Math.random() * 4) + 's ' + (Math.random() * 3) + 's infinite ease-in-out';
            uploadParticles.appendChild(p);
        }
    }

    function injectParticleKeyframes() {
        var style = document.createElement('style');
        style.textContent = '@keyframes particleFloat { 0% { opacity: 0; transform: translateY(0) scale(1); } 20% { opacity: 0.6; } 80% { opacity: 0.3; } 100% { opacity: 0; transform: translateY(-60px) scale(0.5); } }';
        document.head.appendChild(style);
    }

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast('请选择有效的图片文件');
            return;
        }

        currentMetadata = { file: {}, exif: {}, gps: {} };

        var sizeKB = file.size / 1024;
        currentMetadata.file = {
            '文件名': file.name,
            '文件大小': sizeKB >= 1024 ? (sizeKB / 1024).toFixed(2) + ' MB' : sizeKB.toFixed(1) + ' KB',
            '文件类型': file.type,
            '修改时间': new Date(file.lastModified).toLocaleString('zh-CN'),
        };

        var reader = new FileReader();
        reader.onload = function (e) {
            previewImg.src = e.target.result;
            uploadZone.classList.add('has-image');
            resultPanel.classList.add('visible');

            if (scanModeEnabled) {
                triggerScanEffect();
            }

            var ab = e.target.result.slice(0);
            var exifData = parseExif(ab);
            if (exifData.exif) Object.assign(currentMetadata.exif, exifData.exif);
            if (exifData.gps) Object.assign(currentMetadata.gps, exifData.gps);

            var img = new Image();
            img.onload = function () {
                currentMetadata.file['图像尺寸'] = img.naturalWidth + ' × ' + img.naturalHeight + ' px';
                currentMetadata.file['宽高比'] = getAspectRatio(img.naturalWidth, img.naturalHeight);
                if (!currentMetadata.exif.PixelXDimension) {
                    currentMetadata.exif.PixelXDimension = img.naturalWidth;
                    currentMetadata.exif.PixelYDimension = img.naturalHeight;
                }
                previewInfoBar.innerHTML = '<span>' + img.naturalWidth + '×' + img.naturalHeight + '</span><span>' + currentMetadata.file['文件大小'] + '</span>';
                renderMetadata();
                drawHistogram(img);
                extractColors(img);
            };
            img.src = e.target.result;

            copyAllBtn.disabled = false;
            resetBtn.disabled = false;
        };
        reader.readAsArrayBuffer(file);
    }

    function triggerScanEffect() {
        scanLine.classList.remove('active');
        void scanLine.offsetWidth;
        scanLine.classList.add('active');
        setTimeout(function () { scanLine.classList.remove('active'); }, 2200);
    }

    function getAspectRatio(w, h) {
        var gcd = function (a, b) { return b === 0 ? a : gcd(b, a % b); };
        var d = gcd(w, h);
        var rw = w / d, rh = h / d;
        return (rw > 30 || rh > 30) ? (w / h).toFixed(3) + ':1' : rw + ':' + rh;
    }

    function renderMetadata() {
        if (!currentMetadata) return;
        metaScroll.innerHTML = '';

        var groups = [];
        var fileRows = buildFileRows();
        if (fileRows.length) groups.push({ title: 'FILE', rows: fileRows });

        var cameraRows = buildCameraRows();
        if (cameraRows.length) groups.push({ title: 'CAMERA', rows: cameraRows });

        var exposureRows = buildExposureRows();
        if (exposureRows.length) groups.push({ title: 'EXPOSURE', rows: exposureRows });

        var lensRows = buildLensRows();
        if (lensRows.length) groups.push({ title: 'LENS', rows: lensRows });

        var dateRows = buildDateRows();
        if (dateRows.length) groups.push({ title: 'DATE', rows: dateRows });

        var gpsRows = buildGPSRows();
        if (gpsRows.length) groups.push({ title: 'LOCATION', rows: gpsRows });

        var otherRows = buildOtherRows();
        if (otherRows.length) groups.push({ title: 'OTHER', rows: otherRows });

        groups.forEach(function (group) {
            var div = document.createElement('div');
            div.className = 'meta-group';

            var title = document.createElement('div');
            title.className = 'meta-group-title';
            title.innerHTML = '<span class="group-dot"></span>' + group.title;
            div.appendChild(title);

            group.rows.forEach(function (row) {
                var rowEl = document.createElement('div');
                rowEl.className = 'meta-row';

                var label = document.createElement('span');
                label.className = 'meta-label';
                label.textContent = row.label;

                var value = document.createElement('span');
                value.className = 'meta-value' + (row.cls ? ' ' + row.cls : '');
                value.textContent = row.value;

                rowEl.appendChild(label);
                rowEl.appendChild(value);
                rowEl.addEventListener('click', function () {
                    navigator.clipboard.writeText(row.label + ': ' + row.value).then(function () {
                        showToast('已复制: ' + row.label);
                    });
                });
                div.appendChild(rowEl);
            });
            metaScroll.appendChild(div);
        });
    }

    function buildFileRows() {
        var f = currentMetadata.file, rows = [];
        if (f['文件名']) rows.push({ label: '文件名', value: f['文件名'] });
        if (f['文件大小']) rows.push({ label: '文件大小', value: f['文件大小'], cls: 'accent' });
        if (f['文件类型']) rows.push({ label: '文件类型', value: f['文件类型'] });
        if (f['图像尺寸']) rows.push({ label: '图像尺寸', value: f['图像尺寸'], cls: 'accent' });
        if (f['宽高比']) rows.push({ label: '宽高比', value: f['宽高比'] });
        if (f['修改时间']) rows.push({ label: '修改时间', value: f['修改时间'] });
        return rows;
    }

    function buildCameraRows() {
        var e = currentMetadata.exif, rows = [];
        if (e.Make) rows.push({ label: '制造商', value: e.Make });
        if (e.Model) rows.push({ label: '相机型号', value: e.Model, cls: 'warm' });
        if (e.Orientation) rows.push({ label: '方向', value: formatOrientation(e.Orientation) });
        if (e.Software) rows.push({ label: '软件', value: e.Software });
        if (e.Copyright) rows.push({ label: '版权', value: e.Copyright });
        if (e.Artist) rows.push({ label: '摄影师', value: e.Artist });
        return rows;
    }

    function buildExposureRows() {
        var e = currentMetadata.exif, rows = [];
        if (e.ExposureTime !== undefined) {
            var t = formatExposureTime(e.ExposureTime);
            if (t) rows.push({ label: '快门速度', value: t, cls: 'accent' });
        }
        if (e.FNumber !== undefined) {
            var fn = formatFNumber(e.FNumber);
            if (fn) rows.push({ label: '光圈', value: fn, cls: 'accent' });
        }
        if (e.ISO !== undefined) rows.push({ label: 'ISO', value: String(e.ISO), cls: 'warm' });
        if (e.ExposureBias !== undefined) {
            var eb = formatExposureBias(e.ExposureBias);
            if (eb) rows.push({ label: '曝光补偿', value: eb });
        }
        if (e.Flash !== undefined) rows.push({ label: '闪光灯', value: formatFlash(e.Flash) });
        if (e.ExposureProgram !== undefined) rows.push({ label: '曝光模式', value: formatExposureProgram(e.ExposureProgram) });
        if (e.MeteringMode !== undefined) rows.push({ label: '测光模式', value: formatMeteringMode(e.MeteringMode) });
        if (e.ColorSpace !== undefined) rows.push({ label: '色彩空间', value: formatColorSpace(e.ColorSpace) });
        return rows;
    }

    function buildLensRows() {
        var e = currentMetadata.exif, rows = [];
        if (e.FocalLength !== undefined) rows.push({ label: '焦距', value: formatFocalLength(e.FocalLength), cls: 'green' });
        if (e.FocalLength35mm) rows.push({ label: '等效焦距(35mm)', value: formatFocalLength(e.FocalLength35mm) });
        if (e.MaxAperture !== undefined) rows.push({ label: '最大光圈', value: formatFNumber(e.MaxAperture) });
        if (e.LensModel) rows.push({ label: '镜头型号', value: e.LensModel, cls: 'warm' });
        if (e.LensMake) rows.push({ label: '镜头品牌', value: e.LensMake });
        return rows;
    }

    function buildDateRows() {
        var e = currentMetadata.exif, rows = [];
        if (e.DateTimeOriginal) rows.push({ label: '拍摄时间', value: e.DateTimeOriginal, cls: 'accent' });
        if (e.DateTimeDigitized) rows.push({ label: '数字化时间', value: e.DateTimeDigitized });
        if (e.DateTime && !e.DateTimeOriginal) rows.push({ label: '修改时间', value: e.DateTime });
        return rows;
    }

    function buildGPSRows() {
        var g = currentMetadata.gps, rows = [];
        if (g.latitude !== undefined && g.latitude !== null)
            rows.push({ label: '纬度', value: g.latitude.toFixed(6) + '° ' + (g.latitudeRef || 'N'), cls: 'green' });
        if (g.longitude !== undefined && g.longitude !== null)
            rows.push({ label: '经度', value: g.longitude.toFixed(6) + '° ' + (g.longitudeRef || 'E'), cls: 'green' });
        if (g.altitude !== undefined && g.altitude !== null)
            rows.push({ label: '海拔', value: g.altitude.toFixed(1) + ' m' });
        return rows;
    }

    function buildOtherRows() {
        var e = currentMetadata.exif, rows = [];
        if (e.XResolution) rows.push({ label: 'X 分辨率', value: e.XResolution.toFixed(0) + ' dpi' });
        if (e.YResolution) rows.push({ label: 'Y 分辨率', value: e.YResolution.toFixed(0) + ' dpi' });
        return rows;
    }

    function drawHistogram(img) {
        var tmpCanvas = document.createElement('canvas');
        var scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
        tmpCanvas.width = Math.round(img.naturalWidth * scale);
        tmpCanvas.height = Math.round(img.naturalHeight * scale);
        var ctx = tmpCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, tmpCanvas.width, tmpCanvas.height);

        var imageData = ctx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        var data = imageData.data;
        var rH = new Array(256).fill(0), gH = new Array(256).fill(0), bH = new Array(256).fill(0);
        var lumH = new Array(256).fill(0);

        for (var i = 0; i < data.length; i += 4) {
            rH[data[i]]++;
            gH[data[i + 1]]++;
            bH[data[i + 2]]++;
            var lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            lumH[lum]++;
        }

        var maxVal = 0;
        for (var j = 0; j < 256; j++) {
            maxVal = Math.max(maxVal, rH[j], gH[j], bH[j], lumH[j]);
        }

        var hCanvas = histogramCanvas;
        var hCtx = hCanvas.getContext('2d');
        var w = hCanvas.width, h = hCanvas.height;
        hCtx.clearRect(0, 0, w, h);

        hCtx.fillStyle = 'rgba(0,0,0,0.2)';
        hCtx.fillRect(0, 0, w, h);

        var barW = w / 256;

        function drawChannel(hist, color) {
            hCtx.beginPath();
            hCtx.moveTo(0, h);
            for (var k = 0; k < 256; k++) {
                var barH = maxVal > 0 ? (hist[k] / maxVal) * h * 0.9 : 0;
                hCtx.lineTo(k * barW, h - barH);
            }
            hCtx.lineTo(w, h);
            hCtx.closePath();
            hCtx.fillStyle = color;
            hCtx.fill();
        }

        drawChannel(rH, 'rgba(255, 80, 80, 0.22)');
        drawChannel(gH, 'rgba(80, 255, 120, 0.22)');
        drawChannel(bH, 'rgba(80, 140, 255, 0.22)');
        drawChannel(lumH, 'rgba(255, 255, 255, 0.12)');
    }

    function extractColors(img) {
        var tmpCanvas = document.createElement('canvas');
        var size = 100;
        tmpCanvas.width = size;
        tmpCanvas.height = size;
        var ctx = tmpCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        var data = ctx.getImageData(0, 0, size, size).data;

        var buckets = {};
        var totalR = 0, totalG = 0, totalB = 0;
        var count = 0;

        for (var i = 0; i < data.length; i += 4) {
            var r = Math.round(data[i] / 32) * 32;
            var g = Math.round(data[i + 1] / 32) * 32;
            var b = Math.round(data[i + 2] / 32) * 32;
            var key = r + ',' + g + ',' + b;
            if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, c: 0 };
            buckets[key].r += data[i];
            buckets[key].g += data[i + 1];
            buckets[key].b += data[i + 2];
            buckets[key].c++;
            totalR += data[i]; totalG += data[i + 1]; totalB += data[i + 2];
            count++;
        }

        var sorted = Object.values(buckets).sort(function (a, b) { return b.c - a.c; });
        var dominant = sorted.slice(0, 8).map(function (b) {
            return {
                r: Math.round(b.r / b.c),
                g: Math.round(b.g / b.c),
                b: Math.round(b.b / b.c),
                pct: ((b.c / count) * 100).toFixed(1)
            };
        });

        currentMetadata.colors = dominant;
        currentMetadata.avgColor = {
            r: Math.round(totalR / count),
            g: Math.round(totalG / count),
            b: Math.round(totalB / count)
        };

        renderColorView(dominant, count);
    }

    function renderColorView(colors, totalCount) {
        colorView.innerHTML = '';

        var title = document.createElement('div');
        title.className = 'color-palette-title';
        title.textContent = 'DOMINANT COLORS';
        colorView.appendChild(title);

        var swatches = document.createElement('div');
        swatches.className = 'color-swatches';

        colors.forEach(function (c) {
            var swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.background = 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
            swatch.title = 'RGB(' + c.r + ', ' + c.g + ', ' + c.b + ') ' + c.pct + '%';

            var label = document.createElement('span');
            label.className = 'color-swatch-label';
            label.textContent = c.pct + '%';
            swatch.appendChild(label);

            swatch.addEventListener('click', function () {
                var hex = '#' + ((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1).toUpperCase();
                navigator.clipboard.writeText(hex).then(function () {
                    showToast('已复制: ' + hex);
                });
            });
            swatches.appendChild(swatch);
        });
        colorView.appendChild(swatches);

        var avg = currentMetadata.avgColor;
        var stats = document.createElement('div');
        stats.className = 'color-stats';

        stats.innerHTML =
            '<div class="color-stat"><div class="color-stat-label">AVG R</div><div class="color-stat-value" style="color:rgba(255,100,100,0.9)">' + avg.r + '</div></div>' +
            '<div class="color-stat"><div class="color-stat-label">AVG G</div><div class="color-stat-value" style="color:rgba(100,255,140,0.9)">' + avg.g + '</div></div>' +
            '<div class="color-stat"><div class="color-stat-label">AVG B</div><div class="color-stat-value" style="color:rgba(100,160,255,0.9)">' + avg.b + '</div></div>';

        colorView.appendChild(stats);
    }

    function switchView(view) {
        btnViewImage.classList.remove('active');
        btnViewHistogram.classList.remove('active');
        btnViewLocation.classList.remove('active');
        btnViewColor.classList.remove('active');
        imagePreview.classList.add('hidden');
        histogramCanvas.classList.add('hidden');
        locationView.classList.add('hidden');
        colorView.classList.add('hidden');

        if (view === 'image') {
            btnViewImage.classList.add('active');
            imagePreview.classList.remove('hidden');
        } else if (view === 'histogram') {
            btnViewHistogram.classList.add('active');
            histogramCanvas.classList.remove('hidden');
        } else if (view === 'location') {
            btnViewLocation.classList.add('active');
            locationView.classList.remove('hidden');
            updateLocationView();
        } else if (view === 'color') {
            btnViewColor.classList.add('active');
            colorView.classList.remove('hidden');
        }
    }

    function updateLocationView() {
        var g = currentMetadata ? currentMetadata.gps : {};
        locationView.innerHTML = '';

        if (g.latitude !== undefined && g.latitude !== null && g.longitude !== undefined && g.longitude !== null) {
            var iframe = document.createElement('iframe');
            iframe.className = 'location-map';
            iframe.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
                (g.longitude - 0.005) + ',' + (g.latitude - 0.005) + ',' +
                (g.longitude + 0.005) + ',' + (g.latitude + 0.005) +
                '&layer=mapnik&marker=' + g.latitude + ',' + g.longitude;
            iframe.loading = 'lazy';
            locationView.appendChild(iframe);
        } else {
            var placeholder = document.createElement('div');
            placeholder.className = 'location-placeholder';
            placeholder.innerHTML =
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' +
                '</svg>' +
                '<p class="location-text">未找到 GPS 坐标</p>' +
                '<p class="location-coords">此照片未包含地理位置信息</p>';
            locationView.appendChild(placeholder);
        }
    }

    function copyAllMetadata() {
        if (!currentMetadata) return;
        var allGroups = [buildFileRows(), buildCameraRows(), buildExposureRows(), buildLensRows(), buildDateRows(), buildGPSRows(), buildOtherRows()];
        var text = allGroups.flat().map(function (r) { return r.label + ': ' + r.value; }).join('\n');
        navigator.clipboard.writeText(text).then(function () {
            showToast('已复制全部元数据 (' + text.split('\n').length + ' 项)');
        });
    }

    function resetApp() {
        currentMetadata = null;
        uploadZone.classList.remove('has-image');
        resultPanel.classList.remove('visible');
        copyAllBtn.disabled = true;
        resetBtn.disabled = true;
        fileInput.value = '';
        metaScroll.innerHTML = '<div class="meta-empty" id="meta-empty"><div class="meta-empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><p>元数据将在这里呈现</p><p class="meta-empty-hint">照片中隐藏的相机参数、拍摄时间、GPS 坐标等信息</p></div>';
        switchView('image');
    }

    function setupEvents() {
        uploadZone.addEventListener('click', function () { fileInput.click(); });

        fileInput.addEventListener('change', function () {
            if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
        });

        uploadZone.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', function (e) {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', function (e) {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });

        btnViewImage.addEventListener('click', function () { switchView('image'); });
        btnViewHistogram.addEventListener('click', function () { switchView('histogram'); });
        btnViewLocation.addEventListener('click', function () { switchView('location'); });
        btnViewColor.addEventListener('click', function () { switchView('color'); });

        copyAllBtn.addEventListener('click', copyAllMetadata);
        resetBtn.addEventListener('click', resetApp);

        themeToggleBtn.addEventListener('click', function () {
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            var theme = themes[currentThemeIndex];
            if (theme) {
                document.documentElement.setAttribute('data-theme', theme);
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            showToast(theme ? '配色: ' + theme : '配色: 默认');
        });

        scanModeBtn.addEventListener('click', function () {
            scanModeEnabled = !scanModeEnabled;
            scanModeBtn.classList.toggle('active', scanModeEnabled);
            showToast(scanModeEnabled ? '扫描动效: 开启' : '扫描动效: 关闭');
        });

        imagePreview.addEventListener('mousemove', function (e) {
            var rect = imagePreview.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            lensFlare.style.left = x + 'px';
            lensFlare.style.top = y + 'px';
        });

        document.addEventListener('paste', function (e) {
            var items = e.clipboardData && e.clipboardData.items;
            if (!items) return;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image/') === 0) {
                    var blob = items[i].getAsFile();
                    if (blob) handleFile(blob);
                    break;
                }
            }
        });
    }

    injectParticleKeyframes();
    spawnUploadParticles();
    setupEvents();
})();
