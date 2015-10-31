'use strict';

var App = {

	// Métodos de interface

	init: function(args){
		this.loadedImage = false;
		this.html = {
			content: args.content,
			input: args.input
		};

		this.PIXEL_LENGTH = 4;
		this.WHITE_PIXEL = [255, 255, 255, 255];
		this.BLACK_PIXEL = [0, 0, 0, 255];

		// Properties for cache
		this._cacheObj = null;
		this._currentActionName = null;

		this._prepareInputs(args.sidebar);
		this._buildContent();
	},

	_prepareInputs: function(sidebar){
		function buttonCall(){
			App.execute(this.dataset.action);
		}

		var buttons = sidebar.getElementsByTagName('button');
		[].slice.call(buttons).forEach(function(btn){
			btn.addEventListener('click', buttonCall);
		}, this);

		var inputs = sidebar.querySelectorAll('input[type="range"]');
		[].slice.call(inputs).forEach(function(element){
			var span = this._create('span');
			span.classList.add('labeled-range');
			this._create('span', element.min, span).classList.add('display-min');
			var output = this._create('output', '-', span);
			this._create('span', element.max, span).classList.add('display-max');

			function execAction(ev){
				ev.stopPropagation();

				var value = Math.round(+this.value);
				output['value' in output ? 'value' : 'textContent'] = value;
				App.execute(this.dataset.action, value);
			}
			element.addEventListener('input', execAction);
			element.addEventListener('change', execAction);

			element.parentNode.insertBefore(span, element);
			span.insertBefore(element, span.firstChild);
		}, this);

		this.html.input.addEventListener('change', this._uploadFile);
	},

	_buildContent: function(){
		var fragment = document.createDocumentFragment();

		this.html.preview = this._create('canvas');
		fragment.appendChild(this.html.preview);
		this.previewContext = this.html.preview.getContext('2d');

		this.html.result = this._create('div');
		this.html.result.classList.add('result');
		fragment.appendChild(this.html.result);

		this.html.content.appendChild(fragment);
	},

	_uploadFile: function(){
		if(this.files && this.files.length){
			var file = this.files[0],
				img = new Image();

			img.onload = function(){
				App.loadPreviewImage(this);
			};
			img.src = URL.createObjectURL(file);
		}
	},

	loadPreviewImage: function(image){
		var preview = this.html.preview;

		preview.classList.add('active');
		preview.width = image.width;
		preview.height = image.height;

		this.previewContext.drawImage(image, 0, 0);

		this.loadedImage = true;
		document.body.classList.add('img-loaded');
		this.html.result.innerHTML = '';

		this._cacheObj = {};
	},

	_replaceResultContent: function(element){
		this.html.result.innerHTML = '';
		if(element)
			this.html.result.appendChild(element);
	},

	_create: function(str, content, parentNode){
		var element = document.createElement(str);

		if(content)
			element.innerHTML = content;

		if(parentNode)
			parentNode.appendChild(element);

		return element;
	},

	_getHistogramComponent: function(arr){
		var fragment = document.createDocumentFragment(),
			root = this._create('div', null, fragment),
			max = Math.ceil(this._getHistogramMax(arr) * 1.15);

		root.classList.add('histogram');
		this._create('span', arr.length - 1, root).classList.add('histogram-max-x');
		this._create('span', '0', root).classList.add('histogram-min-x');
		this._create('span', max, root).classList.add('histogram-max-y');
		this._create('span', '0', root).classList.add('histogram-min-y');

		arr.forEach(function(value, index){
			var point = this._create('div', null, root),
				percentageX = index / arr.length * 100,
				percentageY = value / max * 100;

			point.classList.add('histogram-point');
			point.style.left = percentageX.toFixed(4) + '%';
			point.style.top = (100 - percentageY).toFixed(4) + '%';
		}, this);

		return fragment;
	},

	_createCanvasFromImageData: function(imgData){
		var fragment = document.createDocumentFragment(),
			canvas = this._create('canvas', null, fragment);

		canvas.classList.add('active');
		canvas.width = imgData.width;
		canvas.height = imgData.height;
		canvas.getContext('2d').putImageData(imgData, 0, 0);

		return fragment;
	},

	_enableLoader: function(){
		this.html.content.classList.add('processing');
	},

	_disableLoader: function(){
		this.html.content.classList.remove('processing');
	},

	_cacheFunctionReturn: function(callback){
		var str = this._currentActionName;
		if(!this._cacheObj[str])
			this._cacheObj[str] = callback.call(this);

		return this._cacheObj[str];
	},

	// Métodos da aplicação

	execute: function(str, value){
		this._enableLoader();

		var methods = {
			display_info: 'displayInfo',
			greater_avg_black: 'paintBlackGreaterAvg',
			greater_mode_150: 'paint150GreaterMode',
			greater_median_white: 'paintWhiteGreaterMedian',
			lesser_avg_100: 'paint100LesserAvg',
			lesser_median_255_lesser_0: 'paint255GreaterMedian0LesserAvg',
			enlarge_2x: 'enlarge2x',
			decrease_2x: 'decrease2x',
			rotate_90_anticlockwise: 'rotate90Anticlockwise',
			rotate_90_clockwise: 'rotate90Clockwise',
			mirror_horizontally: 'mirrorHorizontally',
			mirror_vertically: 'mirrorVertically',
			translate_50: 'translate50',
			custom_thresholding: 'customThresholding',
			median_filter: 'medianFilter',
			border_detection_sobel: 'detectBorderSobel',
			border_detection_kirsch: 'detectBorderKirsch',
			apply_dilatation: 'applyDilatation',
			apply_erosion: 'applyErosion'
		};

		this._currentActionName = str;

		setTimeout(function(){
			App[methods[str]](value);
			App._disableLoader();
		}, 0);
	},

	displayInfo: function(){
		var imgData = this.getPreviewImageData(),
			obj = this.getImageDataInfo(imgData),
			halfHeight = imgData.height / 2,
			topPixels = [],
			bottomPixels = [];

		this.forEachPixel(imgData, function(pixel, _, y){
			var colorValue = this.getAverageOf(pixel);
			(y < halfHeight ? topPixels : bottomPixels).push(colorValue);
		});

		// Exibir resultados na interface
		var result = this.html.result,
			fragment = document.createDocumentFragment(),
			list = this._create('ul');

		list.classList.add('featured-box');
		fragment.appendChild(list);

		var refLi = this._create('li', '<strong>Histograma da imagem:</strong>', list);
		refLi.appendChild(this._getHistogramComponent(obj.histogram));

		var topPixelsAvg = this._average(topPixels);
		this._create('li', '<strong>Média de cinza na metade superior da imagem:</strong> ' + topPixelsAvg.toFixed(2), list);

		var bottomPixelsMedian = this._median(bottomPixels);
		this._create('li', '<strong>Mediana de cinza na metade inferior da imagem:</strong> ' + bottomPixelsMedian.toFixed(2), list);

		var modes = this._getModesFromHistogram(obj.histogram),
			tmpStr = '<strong>Moda de cinza em toda a imagem:</strong> ' + modes.join(', ');
		tmpStr += ' (' + obj.histogram[modes[0]] + ' aparições)';
		this._create('li', tmpStr, list);

		var variance = this._variance(obj.allPixels);
		this._create('li', '<strong>Variância de cinza em toda a imagem:</strong> ' + variance.toFixed(2), list);

		result.innerHTML = '';
		result.appendChild(fragment);
	},

	paintBlackGreaterAvg: function(){
		var imgData = this.getPreviewImageData(),
			obj = this.getImageDataInfo(imgData),
			avg = this._average(obj.allPixels),
			newImgData = this.previewContext.createImageData(imgData),
			blackPixel = [0, 0, 0, 255];

		this.forEachPixel(imgData, function(pixel, _, __, index){
			var colorValue = this.getAverageOf(pixel),
				newPixel = colorValue >= avg ? blackPixel : pixel;

			this.setPixel(newImgData, index, newPixel);
		});

		var canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	paint150GreaterMode: function(){
		var imgData = this.getPreviewImageData(),
			obj = this.getImageDataInfo(imgData),
			mode = this._getModesFromHistogram(obj.histogram)[0],
			newImgData = this.previewContext.createImageData(imgData),
			pixel150 = [150, 150, 150, 255];

		this.forEachPixel(imgData, function(pixel, _, __, index){
			var colorValue = this.getAverageOf(pixel),
				newPixel = colorValue >= mode ? pixel150 : pixel;

			this.setPixel(newImgData, index, newPixel);
		});

		var canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	paintWhiteGreaterMedian: function(){
		var imgData = this.getPreviewImageData(),
			obj = this.getImageDataInfo(imgData),
			median = this._median(obj.allPixels),
			newImgData = this.previewContext.createImageData(imgData);

		this.forEachPixel(imgData, function(pixel, _, __, index){
			var colorValue = this.getAverageOf(pixel),
				newPixel = colorValue >= median ? this.WHITE_PIXEL : pixel;

			this.setPixel(newImgData, index, newPixel);
		});

		var canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	paint100LesserAvg: function(){
		var imgData = this.getPreviewImageData(),
			obj = this.getImageDataInfo(imgData),
			avg = this._average(obj.allPixels),
			newImgData = this.previewContext.createImageData(imgData),
			pixel100 = [100, 100, 100, 255];

		this.forEachPixel(imgData, function(pixel, _, __, index){
			var colorValue = this.getAverageOf(pixel),
				newPixel = colorValue < avg ? pixel100 : pixel;

			this.setPixel(newImgData, index, newPixel);
		});

		var canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	paint255GreaterMedian0LesserAvg: function(){
		var imgData = this.getPreviewImageData(),
			obj = this.getImageDataInfo(imgData),
			median = this._median(obj.allPixels),
			avg = this._average(obj.allPixels),
			newImgData = this.previewContext.createImageData(imgData);

		this.forEachPixel(imgData, function(pixel, _, __, index){
			var colorValue = this.getAverageOf(pixel),
				newPixel = colorValue >= median ? this.WHITE_PIXEL : colorValue < avg ? this.BLACK_PIXEL : pixel;

			this.setPixel(newImgData, index, newPixel);
		});

		var canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	enlarge2x: function(){
		var imgData = this.getPreviewImageData(),
			newImgData = this._resizedImageData(imgData, 2),
			canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	decrease2x: function(){
		var imgData = this.getPreviewImageData(),
			newImgData = this._resizedImageData(imgData, .5),
			canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	rotate90Anticlockwise: function(){
		var imgData = this.getPreviewImageData(),
			newImgData = this._rotatedImageData(imgData, -90),
			canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	rotate90Clockwise: function(){
		var imgData = this.getPreviewImageData(),
			newImgData = this._rotatedImageData(imgData, 90),
			canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	mirrorHorizontally: function(){
		var imgData = this.getPreviewImageData(),
			newImgData = this.previewContext.createImageData(imgData),
			width = imgData.width - 1;

		this.forEachPixelRealocate(imgData, newImgData, function(x, y){
			return {
				x: width - x,
				y: y
			};
		});

		var canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	mirrorVertically: function(){
		var imgData = this.getPreviewImageData(),
			newImgData = this.previewContext.createImageData(imgData),
			height = imgData.height - 1;

		this.forEachPixelRealocate(imgData, newImgData, function(x, y){
			return {
				x: x,
				y: height - y
			};
		});

		var canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	translate50: function(){
		var size = 50,
			imgData = this.getPreviewImageData(),
			newImgData = this.previewContext.createImageData(imgData.width + 2 * size, imgData.height + 2 * size);

		this.forEachPixelRealocate(imgData, newImgData, function(x, y){
			return {
				x: x + size,
				y: y + size
			};
		});

		var canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
	},

	customThresholding: function(value){
		var imgData = this._cacheFunctionReturn(function(){

			var imgData = this.getPreviewImageData();

			if(!this._isGrayscale(imgData))
				imgData = this._getGrayscaleImageData(imgData);

			return imgData;

		});

		imgData = this._applyCustomThresholding(imgData, value);

		var canvas = this._createCanvasFromImageData(imgData);
		this._replaceResultContent(canvas);
	},

	medianFilter: function(){
		var imgData = this.getPreviewImageData();
		if(!this._isGrayscale(imgData))
			imgData = this._getGrayscaleImageData(imgData);
		imgData = this._applyMedianFilter(imgData);

		var canvas = this._createCanvasFromImageData(imgData);
		this._replaceResultContent(canvas);
	},

	detectBorderSobel: function(threshold){
		var imgData = this._cacheFunctionReturn(function(){

			var imgData = this.getPreviewImageData(),
				kernels = [
					[
						[1, 0, -1],
						[2, 0, -2],
						[1, 0, -1]
					],
					[
						[1, 2, 1],
						[0, 0, 0],
						[-1, -2, -1]
					]
				];

			if(!this._isGrayscale(imgData))
				imgData = this._getGrayscaleImageData(imgData);
			imgData = this._applyMedianFilter(imgData);

			imgData = this._applyConvolution(imgData, 3, function(matrix){
				var sum = [0, 0];
				for(var x = 0, len = matrix.length; x < len; x++){
					for(var y = 0; y < len; y++){
						var pixelValue = matrix[x][y][0];
						for(var z = 2; z--;)
							sum[z] += pixelValue * kernels[z][x][y];
					}
				}

				var value = Math.round(Math.sqrt(Math.pow(sum[0], 2) + Math.pow(sum[1], 2))) % 255;
				return [value, value, value, 255];
			});

			return imgData;

		});

		imgData = this._applyCustomThresholding(imgData, threshold);

		var canvas = this._createCanvasFromImageData(imgData);
		this._replaceResultContent(canvas);
	},

	detectBorderKirsch: function(threshold){
		var imgData = this._cacheFunctionReturn(function(){

			var imgData = this.getPreviewImageData(),
				kernel = [
					[5, -3, -3],
					[5, 0, -3],
					[5, -3, -3]
				],
				kernels = [],
				zeroFilledArr = [],
				kernelLen = kernel.length,
				kernelOrder = Math.pow(kernelLen, 2),
				middleIndex = Math.floor(kernelOrder / 2);

			// Gerando os kernels necessários para a convolução
			for(var len = 8; len--;){
				var kernelCopy = JSON.parse(JSON.stringify(kernel));

				for(var len1 = kernelOrder; len1--;){
					if(len1 == middleIndex)
						continue;

					var distanceToMiddle = middleIndex - len1,
						addValue = Math.abs(distanceToMiddle) > 2 ? 1 : kernelLen,
						factor = (addValue == 1 && distanceToMiddle > 0) || (addValue == kernelLen && len1 % kernelLen > kernelLen / 2) ? 1 : -1,
						newIndex = (len1 + addValue * factor) % kernelOrder;

					kernelCopy[Math.floor(newIndex / kernelLen)][newIndex % kernelLen] = kernel[Math.floor(len1 / kernelLen)][len1 % kernelLen];
				}

				kernel = kernelCopy;
				kernels.push(kernel);
				zeroFilledArr.push(0);
			}

			if(!this._isGrayscale(imgData))
				imgData = this._getGrayscaleImageData(imgData);
			imgData = this._applyMedianFilter(imgData);

			imgData = this._applyConvolution(imgData, kernelLen, function(matrix){
				var localKernels = kernels,
					all = zeroFilledArr.slice();

				for(var x = 0, len = matrix.length; x < len; x++){
					for(var y = 0; y < len; y++){
						var pixelValue = matrix[x][y][0];
						for(var z = localKernels.length; z--;)
							all[z] += pixelValue * localKernels[z][x][y];
					}
				}

				var value = Math.max.apply(Math, all);
				return [value, value, value, 255];
			});

			return imgData;

		});

		imgData = this._applyCustomThresholding(imgData, threshold);

		var canvas = this._createCanvasFromImageData(imgData);
		this._replaceResultContent(canvas);
	},

	applyDilatation: function(){
		var imgData = this.getPreviewImageData();
		if(!this._isGrayscale(imgData))
			imgData = this._getGrayscaleImageData(imgData);

		var structuringElement = [
			[-10, -10, -10],
			[-10, -10, -10],
			[-10, -10, -10]
		];

		imgData = this._applyStructuringElement(imgData, structuringElement, Math.min, 255);

		var canvas = this._createCanvasFromImageData(imgData);
		this._replaceResultContent(canvas);
	},

	applyErosion: function(){
		var imgData = this.getPreviewImageData();
		if(!this._isGrayscale(imgData))
			imgData = this._getGrayscaleImageData(imgData);

		var structuringElement = [
			[10, 10, 10],
			[10, 10, 10],
			[10, 10, 10]
		];

		imgData = this._applyStructuringElement(imgData, structuringElement, Math.max, 255);
		
		var canvas = this._createCanvasFromImageData(imgData);
		this._replaceResultContent(canvas);
	},

	// Métodos de interação com objetos ImageData

	getPreviewImageData: function(){
		if(!this.loadedImage)
			throw "No image was uploaded!";

		var prev = this.html.preview;
		return this.previewContext.getImageData(0, 0, prev.width, prev.height);
	},

	getImageDataInfo: function(imgData){
		var obj = {
			histogram: new Array(256),
			allPixels: []
		};

		for(var len = 256; len--;)
			obj.histogram[len] = 0;

		// Itera sobre todos os pixels, realizando as verificações necessárias
		this.forEachPixel(imgData, function(pixel, x, y){
			var colorValue = this.getAverageOf(pixel);
			obj.histogram[colorValue]++;
			obj.allPixels.push(colorValue);
		});

		return obj;
	},

	forEachPixel: function(imageData, callback){
		var data = imageData.data,
			width = imageData.width,
			height = imageData.height;

		for(var offset = 0, y = 0; y < height; y++){
			for(var x = 0; x < width; x++, offset += this.PIXEL_LENGTH)
				callback.call(this, data.subarray(offset, offset + this.PIXEL_LENGTH), x, y, offset);
		}
	},

	getAverageOf: function(pixel){
		return Math.round((pixel[0] + pixel[1] + pixel[2]) / 3);
	},

	getGrayscaleOf: function(pixel){
		return Math.round(pixel[0] * .2126 + pixel[1] * .7152 + pixel[2] * .0722);
	},

	setPixel: function(imgData, offset, pixel){
		// Replaces the pixel at the right index of the ImageData object
		for(var data = imgData.data, len = pixel.length; len--;)
			data[offset + len] = pixel[len];
	},

	setPixelAt: function(imgData, x, y, pixel){
		this.setPixel(imgData, pixel.length * (y * imgData.width + x), pixel);
	},

	isLocatedInside: function(imgData, x, y){
		for(var props = ['width', 'height'], values = [x, y], len = props.length; len--;){
			var half = Math.floor(imgData[props[len]] / 2);
			if(Math.abs(values[len] - half) > half)
				return false;
		}

		return true;
	},

	forEachPixelRealocate: function(imgDataSrc, imgDataDst, callback){
		var data = imgDataSrc.data,
			width = imgDataSrc.width,
			height = imgDataSrc.height;

		for(var y = 0, offset = 0; y < height; y++){
			for(var x = 0; x < width; x++, offset += this.PIXEL_LENGTH){
				var obj = callback.call(this, x, y);
				if(obj)
					this.setPixelAt(imgDataDst, obj.x, obj.y, data.subarray(offset, offset + this.PIXEL_LENGTH));
			}
		}
	},

	_resizedImageData: function(imgData, num){
		var newImgData = this.previewContext.createImageData(imgData.width * num, imgData.height * num),
			countNum = Math.ceil(num),
			powCountNum = Math.pow(countNum, 2);

		this.forEachPixel(imgData, function(pixel, x, y){
			var localCountNum = countNum, len = powCountNum; // Replicate variables in this scope
			for(var x = Math.floor(num * x), y = Math.floor(num * y), counter = 0; counter < len; counter++)
				this.setPixelAt(newImgData, x + (counter % localCountNum), y + Math.floor(counter / localCountNum), pixel);
		});

		return newImgData;
	},

	_rotatedImageData: function(imgData, degree){
		var radians = degree / 180 * Math.PI,
			sin = Math.sin(radians),
			cos = Math.cos(radians),
			newWidth = imgData.width * Math.abs(cos) + imgData.height * Math.abs(sin),
			newHeight = imgData.width * Math.abs(sin) + imgData.height * Math.abs(cos),
			newImgData = this.previewContext.createImageData(newWidth, newHeight),
			centerX = Math.floor(imgData.width / 2),
			centerY = Math.floor(imgData.height / 2),
			newCenterX = Math.floor(newImgData.width / 2),
			newCenterY = Math.floor(newImgData.height / 2);

		this.forEachPixelRealocate(imgData, newImgData, function(x, y){
			var diffX = x - centerX,
				diffY = y - centerY;

			x = newCenterX + diffX * cos - diffY * sin;
			y = newCenterY + diffX * sin + diffY * cos;

			if(!this.isLocatedInside(newImgData, x, y))
				return null;

			return {
				x: Math.round(x),
				y: Math.round(y)
			};
		});

		return newImgData;
	},

	_getGrayscaleImageData: function(imgData){
		var newImgData = this.previewContext.createImageData(imgData);

		this.forEachPixel(imgData, function(pixel, _, __, index){
			var colorValue = this.getGrayscaleOf(pixel);
			for(var len = 3; len--;)
				pixel[len] = colorValue;
			this.setPixel(newImgData, index, pixel);
		});

		return newImgData;
	},

	_applyConvolution: function(imgData, order, callback){
		var newImgData = this.previewContext.createImageData(imgData),

			data = imgData.data,
			newData = new Uint8ClampedArray(data),
			width = imgData.width,
			height = imgData.height,
			halfOrder = Math.floor(order / 2),

			maxWidth = width - halfOrder,
			maxHeight = height - halfOrder;

		for(var y = 0, offset = 0, pixel; y < height; y++){
			for(var x = 0; x < width; x++, offset += this.PIXEL_LENGTH){

				// Se o pixel não estiver nas bordas, realiza a convolução
				if(x >= halfOrder && y >= halfOrder && x < maxWidth && y < maxHeight){
					var matrix = [];

					for(var x1 = 0; x1 < order; x1++){
						matrix[x1] = [];

						for(var y1 = 0; y1 < order; y1++){
							var currentOffset = ((y + y1 - halfOrder) * width + (x + x1 - halfOrder)) * this.PIXEL_LENGTH;
							matrix[x1][y1] = data.subarray(currentOffset, currentOffset + this.PIXEL_LENGTH);
						}
					}

					pixel = callback.call(this, matrix);
					for(var len = pixel.length; len--;)
						newData[offset + len] = pixel[len];
				}
			}
		}

		this.setPixel(newImgData, 0, newData);
		return newImgData;
	},

	_applyMedianFilter: function(imgData){
		return this._applyConvolution(imgData, 3, function(matrix){
			var arr = [];
			for(var x = 0, len = matrix.length; x < len; x++){
				for(var y = 0; y < len; y++)
					arr[x * len + y] = matrix[x][y][0];
			}

			var median = this._median(arr);
			return [median, median, median, 255];
		});
	},

	_isGrayscale: function(imageData){
		for(var data = imageData.data, len = data.length, offset = 0; offset < len; offset += this.PIXEL_LENGTH){
			if(data[offset] != data[offset + 1] || data[offset] != data[offset + 2])
				return false;
		}

		return true;
	},

	_applyCustomThresholding: function(imageData, threshold){
		var newImgData = this.previewContext.createImageData(imageData);

		this.forEachPixel(imageData, function(pixel, _, __, index){
			var newPixel = this[pixel[0] >= threshold ? 'WHITE_PIXEL' : 'BLACK_PIXEL'];
			this.setPixel(newImgData, index, newPixel);
		});

		return newImgData;
	},

	_applyStructuringElement: function (imgData, strucElem, operation, bgValue){
		var data = imgData.data,
			width = imgData.width,
			height = imgData.height,
			order = strucElem.length,
			halfOrder = Math.floor(order / 2),

			maxWidth = width - halfOrder,
			maxHeight = height - halfOrder;

		// Gerar matriz com valores
		var matrix = [];
		for(var x = 0, offset = 0; x < height; x++){
			matrix[x] = new Uint8ClampedArray(width);
			for(var y = 0; y < width; y++, offset += this.PIXEL_LENGTH)
				matrix[x][y] = data[offset];
		}

		var newMatrix = JSON.parse(JSON.stringify(matrix)); // Cria uma copia da matriz

		for(var x = 0; x < height; x++){
			for(var y = 0; y < width; y++){

				if(y >= halfOrder && x >= halfOrder && y < maxWidth && x < maxHeight){
					var list = [];

					for(var x1 = 0; x1 < order; x1++){
						for(var y1 = 0; y1 < order; y1++){
							var factor = strucElem[x1][y1];
							if(factor == null)
								continue;

							var currentValue = matrix[x + x1 - halfOrder][y + y1 - halfOrder];
							if(currentValue != bgValue)
								list.push(currentValue + factor);
						}
					}

					if(!list.length)
						continue;

					var finalValue = operation.apply(Math, list);
					if(finalValue < 0)
						finalValue = 0;
					else if(finalValue > 255)
						finalValue = 255;

					for(var x1 = 0; x1 < order; x1++){
						for(var y1 = 0; y1 < order; y1++){
							if(strucElem[x1][y1] != null){
								var tmpX = x + x1 - halfOrder,
									tmpY = y + y1 - halfOrder,
									tmpValue = operation.apply(Math, [newMatrix[tmpX][tmpY], finalValue]);

								newMatrix[tmpX][tmpY] = tmpValue;
							}
						}
					}

				}
			}
		}

		var newImgData = this.previewContext.createImageData(imgData);

		for(var x = 0, offset = 0, newData = newImgData.data; x < height; x++){
			for(var y = 0; y < width; y++, offset += this.PIXEL_LENGTH){
				var value = newMatrix[x][y], len = this.PIXEL_LENGTH - 1;
				newData[offset + len] = data[offset + len];
				for(; len--;)
					newData[offset + len] = value;
			}
		}

		return newImgData;
	},

	// Métodos com operações matemáticas

	_average: function(arr){
		function adder(a, b){
			return a + b;
		};
		return arr.length ? arr.reduce(adder) / arr.length : 0;
	},

	_median: function(arr){
		arr = arr.slice().sort();
		var half = Math.floor(arr.length / 2);
		return arr.length % 2 ? arr[half] : (arr[half] + arr[half - 1]) / 2;
	},

	_variance: function(arr){
		function varianceAdder(a, b){
			return a + Math.pow(b - avg, 2);
		}
		var avg = this._average(arr);
		return arr.length > 1 ? arr.reduce(varianceAdder) / (arr.length - 1): 0;
	},

	_getHistogramMax: function(arr){
		return Math.max.apply(Math, arr);
	},

	_getModesFromHistogram: function(arr){
		var max = this._getHistogramMax(arr),
			indexes = arr.reduce(function(arr, value, index){
				if(value == max)
					arr.push(index);

				return arr;
			}, []);

		return indexes;
	}

};