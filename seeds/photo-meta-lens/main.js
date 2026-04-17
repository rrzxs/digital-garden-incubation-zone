(function () {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const resultPanel = document.getElementById('result-panel');
    const previewImg = document.getElementById('preview-img');
    const metaScroll = document.getElementById('meta-scroll');
    const metaEmpty = document.getElementById('meta-empty');
    const toastEl = document.getElementById('toast');
    const copyAllBtn = document.getElementById('copy-all-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    const btnViewImage = document.getElementById('btn-view-image');
    const btnViewHistogram = document.getElementById('btn-view-histogram');
    const btnViewLocation = document.getElementById('btn-view-location');
    const imagePreview = document.getElementById('image-preview');
    const histogramCanvas = document.getElementById('histogram-canvas');
    const locationView = document.getElementById('location-view');
    const locationText = document.getElementById('location-text');
    const locationCoords = document.getElementById('location-coords');

    const themes = ['', 'warm', 'emerald', 'rose'];
    let currentThemeIndex = 0;
    let currentMetadata = null;

    const EXIF_TAG_NAMES = {
        0x010f: 'Make',
        0x0110: 'Model',
        0x0112: 'Orientation',
        0x011a: 'XResolution',
        0x011b: 'YResolution',
        0x0128: 'ResolutionUnit',
        0x0131: 'Software',
        0x0132: 'DateTime',
        0x013b: 'Artist',
        0x0213: 'YCbCrPositioning',
        0x8298: 'Copyright',
        0x8769: 'ExifIFDPointer',
        0x8825: 'GPSInfoIFDPointer',
    };

    const EXIF_SUB_TAG_NAMES = {
        0x829a: 'ExposureTime',
        0x829d: 'FNumber',
        0x8822: 'ExposureProgram',
        0x8827: 'ISOSpeedRatings',
        0x9000: 'ExifVersion',
        0x9003: 'DateTimeOriginal',
        0x9004: 'DateTimeDigitized',
        0x9201: 'ShutterSpeedValue',
        0x9202: 'ApertureValue',
        0x9204: 'ExposureBiasValue',
        0x9205: 'MaxApertureValue',
        0x9207: 'MeteringMode',
        0x9209: 'Flash',
        0x920a: 'FocalLength',
        0xa001: 'ColorSpace',
        0xa002: 'PixelXDimension',
        0xa003: 'PixelYDimension',
        0xa005: 'ExifInteroperabilityOffset',
        0xa217: 'SensingMethod',
        0xa300: 'FileSource',
        0xa301: 'SceneType',
        0xa405: 'FocalLengthIn35mmFilm',
        0xa432: 'LensInfo',
        0xa433: 'LensMake',
        0xa434: 'LensModel',
        0xa435: 'LensSerialNumber',
    };

    const GPS_TAG_NAMES = {
        0x0001: 'GPSLatitudeRef',
        0x0002: 'GPSLatitude',
        0x0003: 'GPSLongitudeRef',
        0x0004: 'GPSLongitude',
        0x0005: 'GPSAltitudeRef',
        0x0006: 'GPSAltitude',
        0x0007: 'GPSTimeStamp',
        0x001d: 'GPSDateStamp',
    };

    function getString(dataView, offset, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            const ch = dataView.getUint8(offset + i);
            if (ch === 0) break;
            str += String.fromCharCode(ch);
        }
        return str.trim();
    }

    function getRational(dataView, offset, littleEndian) {
        const num = dataView.getUint32(offset, littleEndian);
        const den = dataView.getUint32(offset + 4, littleEndian);
        if (den === 0) return 0;
        return num / den;
    }

    function getSRational(dataView, offset, littleEndian) {
        const num = dataView.getInt32(offset, littleEndian);
        const den = dataView.getInt32(offset + 4, littleEndian);
        if (den === 0) return 0;
        return num / den;
    }

    function readTagValue(dataView, offset, type, count, littleEndian) {
        const TYPES = {
            1: { size: 1, name: 'BYTE' },
            2: { size: 1, name: 'ASCII' },
            3: { size: 2, name: 'SHORT' },
            4: { size: 4, name: 'LONG' },
            5: { size: 8, name: 'RATIONAL' },
            7: { size: 1, name: 'UNDEFINED' },
            9: { size: 4, name: 'SLONG' },
            10: { size: 8, name: 'SRATIONAL' },
        };

        const typeInfo = TYPES[type];
        if (!typeInfo) return null;

        const totalSize = typeInfo.size * count;
        let valueOffset = offset + 8;
        if (totalSize > 4) {
            valueOffset = dataView.getUint32(offset + 8, littleEndian);
        }

        if (type === 2) {
            return getString(dataView, valueOffset, count);
        }

        if (type === 3) {
            if (count === 1) return dataView.getUint16(valueOffset, littleEndian);
            const arr = [];
            for (let i = 0; i < count; i++) arr.push(dataView.getUint16(valueOffset + i * 2, littleEndian));
            return arr;
        }

        if (type === 4) {
            if (count === 1) return dataView.getUint32(valueOffset, littleEndian);
            const arr = [];
            for (let i = 0; i < count; i++) arr.push(dataView.getUint32(valueOffset + i * 4, littleEndian));
            return arr;
        }

        if (type === 5) {
            if (count === 1) return getRational(dataView, valueOffset, littleEndian);
            const arr = [];
            for (let i = 0; i < count; i++) arr.push(getRational(dataView, valueOffset + i * 8, littleEndian));
            return arr;
        }

        if (type === 10) {
            if (count === 1) return getSRational(dataView, valueOffset, littleEndian);
            const arr = [];
            for (let i = 0; i < count; i++) arr.push(getSRational(dataView, valueOffset + i * 8, littleEndian));
            return arr;
        }

        if (type === 1 || type === 7) {
            if (count === 1) return dataView.getUint8(valueOffset);
            const arr = [];
            for (let i = 0; i < count; i++) arr.push(dataView.getUint8(valueOffset + i));
            return arr;
        }

        if (type === 9) {
            if (count === 1) return dataView.getInt32(valueOffset, littleEndian);
            const arr = [];
            for (let i = 0; i < count; i++) arr.push(dataView.getInt32(valueOffset + i * 4, littleEndian));
            return arr;
        }

        return null;
    }

    function parseIFD(dataView, ifdOffset, tagNames, littleEndian, result) {
        if (ifdOffset + 2 > dataView.byteLength) return;
        const entryCount = dataView.getUint16(ifdOffset, littleEndian);
        for (let i = 0; i < entryCount; i++) {
            const entryOffset = ifdOffset + 2 + i * 12;
            if (entryOffset + 12 > dataView.byteLength) break;

            const tag = dataView.getUint16(entryOffset, littleEndian);
            const type = dataView.getUint16(entryOffset + 2, littleEndian);
            const count = dataView.getUint32(entryOffset + 4, littleEndian);
            const tagName = tagNames[tag] || ('Unknown_0x' + tag.toString(16).padStart(4, '0'));
            const value = readTagValue(dataView, entryOffset, type, count, littleEndian);

            if (value !== null) {
                result[tagName] = value;
            }
        }
    }

    function parseExif(buffer) {
        const dataView = new DataView(buffer);
        const result = { file: {}, exif: {}, gps: {} };

        if (dataView.getUint16(0) !== 0xFFD8) return result;

        let offset = 2;
        while (offset < dataView.byteLength) {
            if (dataView.getUint8(offset) !== 0xFF) break;
            const marker = dataView.getUint8(offset + 1);

            if (marker === 0xE1) {
                const segLength = dataView.getUint16(offset + 2);
                const exifHeader = getString(dataView, offset + 4, 4);
                if (exifHeader !== 'Exif') break;

                const tiffOffset = offset + 10;
                const littleEndian = dataView.getUint16(tiffOffset) === 0x4949;
                const magic = dataView.getUint16(tiffOffset + 2, littleEndian);
                if (magic !== 0x002A) break;

                const firstIFDOffset = dataView.getUint32(tiffOffset + 4, littleEndian);

                const ifd0 = {};
                parseIFD(dataView, tiffOffset + firstIFDOffset, EXIF_TAG_NAMES, littleEndian, ifd0);

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
                    const subIFD = {};
                    parseIFD(dataView, tiffOffset + ifd0.ExifIFDPointer, EXIF_SUB_TAG_NAMES, littleEndian, subIFD);
                    if (subIFD.ExposureTime !== undefined) result.exif.ExposureTime = subIFD.ExposureTime;
                    if (subIFD.FNumber !== undefined) result.exif.FNumber = subIFD.FNumber;
                    if (subIFD.ISOSpeedRatings !== undefined) result.exif.ISO = Array.isArray(subIFD.ISOSpeedRatings) ? subIFD.ISOSpeedRatings[0] : subIFD.ISOSpeedRatings;
                    if (subIFD.FocalLength !== undefined) result.exif.FocalLength = subIFD.FocalLength;
                    if (subIFD.FocalLengthIn35mmFilm) result.exif.FocalLength35mm = subIFD.FocalLengthIn35mmFilm;
                    if (subIFD.Flash !== undefined) result.exif.Flash = subIFD.Flash;
                    if (subIFD.ExposureProgram !== undefined) result.exif.ExposureProgram = subIFD.ExposureProgram;
                    if (subIFD.MeteringMode !== undefined) result.exif.MeteringMode = subIFD.MeteringMode;
                    if (subIFD.ColorSpace !== undefined) result.exif.ColorSpace = subIFD.ColorSpace;
                    if (subIFD.DateTimeOriginal) result.exif.DateTimeOriginal = subIFD.DateTimeOriginal;
                    if (subIFD.DateTimeDigitized) result.exif.DateTimeDigitized = subIFD.DateTimeDigitized;
                    if (subIFD.ExposureBiasValue !== undefined) result.exif.ExposureBias = subIFD.ExposureBiasValue;
                    if (subIFD.MaxApertureValue !== undefined) result.exif.MaxAperture = subIFD.MaxApertureValue;
                    if (subIFD.LensModel) result.exif.LensModel = subIFD.LensModel;
                    if (subIFD.LensMake) result.exif.LensMake = subIFD.LensMake;
                    if (subIFD.LensInfo) result.exif.LensInfo = subIFD.LensInfo;
                    if (subIFD.PixelXDimension) result.exif.PixelXDimension = subIFD.PixelXDimension;
                    if (subIFD.PixelYDimension) result.exif.PixelYDimension = subIFD.PixelYDimension;
                }

                if (ifd0.GPSInfoIFDPointer) {
                    const gpsIFD = {};
                    parseIFD(dataView, tiffOffset + ifd0.GPSInfoIFDPointer, GPS_TAG_NAMES, littleEndian, gpsIFD);
                    if (gpsIFD.GPSLatitude && gpsIFD.GPSLatitudeRef) {
                        result.gps.latitude = dmsToDecimal(gpsIFD.GPSLatitude, gpsIFD.GPSLatitudeRef);
                        result.gps.latitudeRef = gpsIFD.GPSLatitudeRef;
                    }
                    if (gpsIFD.GPSLongitude && gpsIFD.GPSLongitudeRef) {
                        result.gps.longitude = dmsToDecimal(gpsIFD.GPSLongitude, gpsIFD.GPSLongitudeRef);
                        result.gps.longitudeRef = gpsIFD.GPSLongitudeRef;
                    }
                    if (gpsIFD.GPSAltitude !== undefined) result.gps.altitude = gpsIFD.GPSAltitude;
                }

                break;
            }

            if (marker === 0xD9 || marker === 0xDA) break;
            if (marker === 0x00 || marker === 0xFF) break;

            const segLength = dataView.getUint16(offset + 2);
            offset += 2 + segLength;
        }

        return result;
    }

    function dmsToDecimal(dms, ref) {
        if (!Array.isArray(dms) || dms.length < 3) return null;
        const degrees = dms[0];
        const minutes = dms[1];
        const seconds = dms[2];
        let decimal = degrees + minutes / 60 + seconds / 3600;
        if (ref === 'S' || ref === 'W') decimal = -decimal;
        return decimal;
    }

    function formatExposureTime(val) {
        if (val === undefined || val === null) return null;
        if (val >= 1) return val.toFixed(1) + 's';
        if (val >= 0.1) return val.toFixed(2) + 's';
        const denom = Math.round(1 / val);
        return '1/' + denom + 's';
    }

    function formatFNumber(val) {
        if (val === undefined || val === null) return null;
        return 'f/' + val.toFixed(1);
    }

    function formatFocalLength(val) {
        if (val === undefined || val === null) return null;
        return val.toFixed(1) + 'mm';
    }

    function formatFlash(val) {
        if (val === undefined || val === null) return null;
        const fired = val & 0x01;
        const mode = (val >> 3) & 0x03;
        const modes = ['', '(强制)', '(抑制)', '(自动)'];
        return (fired ? '闪光' : '未闪光') + (modes[mode] || '');
    }

    function formatExposureProgram(val) {
        const map = {
            0: '未定义', 1: '手动', 2: '程序自动', 3: '光圈优先',
            4: '快门优先', 5: '创意程序', 6: '动作程序', 7: '人像', 8: '风景',
        };
        return map[val] || val;
    }

    function formatMeteringMode(val) {
        const map = {
            0: '未知', 1: '平均', 2: '中央重点', 3: '点测光',
            4: '多点测光', 5: '矩阵测光', 6: '局部测光',
        };
        return map[val] || val;
    }

    function formatColorSpace(val) {
        return val === 1 ? 'sRGB' : val === 0xFFFF ? 'Uncalibrated' : val;
    }

    function formatExposureBias(val) {
        if (val === undefined || val === null) return null;
        const v = val.toFixed(1);
        return (val > 0 ? '+' : '') + v + ' EV';
    }

    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('visible');
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(function () {
            toastEl.classList.remove('visible');
        }, 2800);
    }

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast('请选择有效的图片文件');
            return;
        }

        currentMetadata = { file: {}, exif: {}, gps: {} };

        const fileSizeKB = file.size / 1024;
        currentMetadata.file = {
            '文件名': file.name,
            '文件大小': fileSizeKB >= 1024
                ? (fileSizeKB / 1024).toFixed(2) + ' MB'
                : fileSizeKB.toFixed(1) + ' KB',
            '文件类型': file.type,
            '修改时间': new Date(file.lastModified).toLocaleString('zh-CN'),
        };

        const reader = new FileReader();
        reader.onload = function (e) {
            previewImg.src = e.target.result;

            uploadZone.classList.add('has-image');
            resultPanel.classList.add('visible');

            const arrayBuffer = e.target.result.slice(0);
            const exifData = parseExif(arrayBuffer);

            if (exifData.exif) {
                Object.assign(currentMetadata.exif, exifData.exif);
            }
            if (exifData.gps) {
                Object.assign(currentMetadata.gps, exifData.gps);
            }

            var img = new Image();
            img.onload = function () {
                currentMetadata.file['图像尺寸'] = img.naturalWidth + ' x ' + img.naturalHeight + ' px';
                currentMetadata.file['宽高比'] = getAspectRatio(img.naturalWidth, img.naturalHeight);
                if (!currentMetadata.exif.PixelXDimension) {
                    currentMetadata.exif.PixelXDimension = img.naturalWidth;
                    currentMetadata.exif.PixelYDimension = img.naturalHeight;
                }
                renderMetadata();
                drawHistogram(img);
            };
            img.src = e.target.result;

            copyAllBtn.disabled = false;
        };
        reader.readAsArrayBuffer(file);
    }

    function getAspectRatio(w, h) {
        const gcd = function (a, b) { return b === 0 ? a : gcd(b, a % b); };
        const d = gcd(w, h);
        const rw = w / d;
        const rh = h / d;
        if (rw > 30 || rh > 30) {
            return (w / h).toFixed(3) + ':1';
        }
        return rw + ':' + rh;
    }

    function renderMetadata() {
        if (!currentMetadata) return;

        metaScroll.innerHTML = '';

        var groups = [];

        var fileRows = buildFileRows();
        if (fileRows.length) groups.push({ title: 'FILE', icon: 'document', rows: fileRows });

        var cameraRows = buildCameraRows();
        if (cameraRows.length) groups.push({ title: 'CAMERA', icon: 'camera', rows: cameraRows });

        var exposureRows = buildExposureRows();
        if (exposureRows.length) groups.push({ title: 'EXPOSURE', icon: 'aperture', rows: exposureRows });

        var lensRows = buildLensRows();
        if (lensRows.length) groups.push({ title: 'LENS', icon: 'circle', rows: lensRows });

        var dateRows = buildDateRows();
        if (dateRows.length) groups.push({ title: 'DATE', icon: 'clock', rows: dateRows });

        var gpsRows = buildGPSRows();
        if (gpsRows.length) groups.push({ title: 'LOCATION', icon: 'pin', rows: gpsRows });

        var otherRows = buildOtherRows();
        if (otherRows.length) groups.push({ title: 'OTHER', icon: 'info', rows: otherRows });

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
        var f = currentMetadata.file;
        var rows = [];
        if (f['文件名']) rows.push({ label: '文件名', value: f['文件名'] });
        if (f['文件大小']) rows.push({ label: '文件大小', value: f['文件大小'], cls: 'accent' });
        if (f['文件类型']) rows.push({ label: '文件类型', value: f['文件类型'] });
        if (f['图像尺寸']) rows.push({ label: '图像尺寸', value: f['图像尺寸'], cls: 'accent' });
        if (f['宽高比']) rows.push({ label: '宽高比', value: f['宽高比'] });
        if (f['修改时间']) rows.push({ label: '修改时间', value: f['修改时间'] });
        return rows;
    }

    function buildCameraRows() {
        var e = currentMetadata.exif;
        var rows = [];
        if (e.Make) rows.push({ label: '制造商', value: e.Make });
        if (e.Model) rows.push({ label: '相机型号', value: e.Model, cls: 'warm' });
        if (e.Orientation) rows.push({ label: '方向', value: formatOrientation(e.Orientation) });
        if (e.Software) rows.push({ label: '软件', value: e.Software });
        if (e.Copyright) rows.push({ label: '版权', value: e.Copyright });
        if (e.Artist) rows.push({ label: '摄影师', value: e.Artist });
        return rows;
    }

    function buildExposureRows() {
        var e = currentMetadata.exif;
        var rows = [];
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
        var e = currentMetadata.exif;
        var rows = [];
        if (e.FocalLength !== undefined) {
            rows.push({ label: '焦距', value: formatFocalLength(e.FocalLength), cls: 'green' });
        }
        if (e.FocalLength35mm) {
            rows.push({ label: '等效焦距(35mm)', value: formatFocalLength(e.FocalLength35mm) });
        }
        if (e.MaxAperture !== undefined) {
            rows.push({ label: '最大光圈', value: formatFNumber(e.MaxAperture) });
        }
        if (e.LensModel) rows.push({ label: '镜头型号', value: e.LensModel, cls: 'warm' });
        if (e.LensMake) rows.push({ label: '镜头品牌', value: e.LensMake });
        return rows;
    }

    function buildDateRows() {
        var e = currentMetadata.exif;
        var rows = [];
        if (e.DateTimeOriginal) rows.push({ label: '拍摄时间', value: e.DateTimeOriginal, cls: 'accent' });
        if (e.DateTimeDigitized) rows.push({ label: '数字化时间', value: e.DateTimeDigitized });
        if (e.DateTime && !e.DateTimeOriginal) rows.push({ label: '修改时间', value: e.DateTime });
        return rows;
    }

    function buildGPSRows() {
        var g = currentMetadata.gps;
        var rows = [];
        if (g.latitude !== undefined && g.latitude !== null) {
            rows.push({ label: '纬度', value: g.latitude.toFixed(6) + '\u00B0 ' + (g.latitudeRef || 'N'), cls: 'green' });
        }
        if (g.longitude !== undefined && g.longitude !== null) {
            rows.push({ label: '经度', value: g.longitude.toFixed(6) + '\u00B0 ' + (g.longitudeRef || 'E'), cls: 'green' });
        }
        if (g.altitude !== undefined && g.altitude !== null) {
            rows.push({ label: '海拔', value: g.altitude.toFixed(1) + ' m' });
        }
        return rows;
    }

    function buildOtherRows() {
        var e = currentMetadata.exif;
        var rows = [];
        if (e.XResolution) rows.push({ label: 'X 分辨率', value: e.XResolution.toFixed(0) + ' dpi' });
        if (e.YResolution) rows.push({ label: 'Y 分辨率', value: e.YResolution.toFixed(0) + ' dpi' });
        return rows;
    }

    function formatOrientation(val) {
        var map = {
            1: '水平(正常)', 2: '水平翻转', 3: '旋转 180\u00B0',
            4: '垂直翻转', 5: '顺时针 90\u00B0 + 水平翻转',
            6: '顺时针 90\u00B0', 7: '逆时针 90\u00B0 + 水平翻转',
            8: '逆时针 90\u00B0',
        };
        return map[val] || String(val);
    }

    function drawHistogram(img) {
        var canvas = document.createElement('canvas');
        var scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;

        var rHist = new Array(256).fill(0);
        var gHist = new Array(256).fill(0);
        var bHist = new Array(256).fill(0);

        for (var i = 0; i < data.length; i += 4) {
            rHist[data[i]]++;
            gHist[data[i + 1]]++;
            bHist[data[i + 2]]++;
        }

        var maxVal = 0;
        for (var j = 0; j < 256; j++) {
            maxVal = Math.max(maxVal, rHist[j], gHist[j], bHist[j]);
        }

        var histCanvas = histogramCanvas;
        var hCtx = histCanvas.getContext('2d');
        var w = histCanvas.width;
        var h = histCanvas.height;
        hCtx.clearRect(0, 0, w, h);

        var barW = w / 256;

        function drawChannel(hist, color) {
            hCtx.beginPath();
            hCtx.moveTo(0, h);
            for (var k = 0; k < 256; k++) {
                var barH = maxVal > 0 ? (hist[k] / maxVal) * h : 0;
                hCtx.lineTo(k * barW, h - barH);
            }
            hCtx.lineTo(w, h);
            hCtx.closePath();
            hCtx.fillStyle = color;
            hCtx.fill();
        }

        drawChannel(rHist, 'rgba(255, 80, 80, 0.25)');
        drawChannel(gHist, 'rgba(80, 255, 120, 0.25)');
        drawChannel(bHist, 'rgba(80, 140, 255, 0.25)');
    }

    function switchView(view) {
        btnViewImage.classList.remove('active');
        btnViewHistogram.classList.remove('active');
        btnViewLocation.classList.remove('active');
        imagePreview.classList.add('hidden');
        histogramCanvas.classList.add('hidden');
        locationView.classList.add('hidden');

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
        var allGroups = [
            buildFileRows(),
            buildCameraRows(),
            buildExposureRows(),
            buildLensRows(),
            buildDateRows(),
            buildGPSRows(),
            buildOtherRows(),
        ];
        var text = allGroups.flat().map(function (r) {
            return r.label + ': ' + r.value;
        }).join('\n');
        navigator.clipboard.writeText(text).then(function () {
            showToast('已复制全部元数据 (' + text.split('\n').length + ' 项)');
        });
    }

    function setupEvents() {
        uploadZone.addEventListener('click', function () {
            fileInput.click();
        });

        fileInput.addEventListener('change', function () {
            if (fileInput.files && fileInput.files[0]) {
                handleFile(fileInput.files[0]);
            }
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
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
            }
        });

        btnViewImage.addEventListener('click', function () { switchView('image'); });
        btnViewHistogram.addEventListener('click', function () { switchView('histogram'); });
        btnViewLocation.addEventListener('click', function () { switchView('location'); });

        copyAllBtn.addEventListener('click', copyAllMetadata);

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

    setupEvents();
})();
