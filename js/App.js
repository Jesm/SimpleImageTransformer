var App = {

	init: function(args){
		this.loadedImage = false;
		this.html = {
			input: args.input
		};
		
		var buttons = args.sidebar.getElementsByTagName('button');
		[].slice.call(buttons).forEach(function(btn){
			btn.addEventListener('click', this._buttonClick);
		}, this);
		
		this.html.input.addEventListener('change', this._uploadFile);

		this._buildContent(args.content);
	},

	_buildContent: function(element){
		var fragment = document.createDocumentFragment();
		
		this.html.preview = this._create('canvas');
		fragment.appendChild(this.html.preview);
		this.previewContext = this.html.preview.getContext('2d');

		this.html.result = this._create('div');
		this.html.result.classList.add('result');
		fragment.appendChild(this.html.result);

		element.appendChild(fragment);
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

	_buttonClick: function(){
		App.execute(this.dataset.action);
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
	},
	
	getPreviewImageData: function(){
		if(!this.loadedImage)
			throw "No image was uploaded!";
		
		var prev = this.html.preview;
		return this.previewContext.getImageData(0, 0, prev.width, prev.height);
	},

	execute: function(str){
		var methods = {
			display_info: 'displayInfo',
			bigger_avg_black: 'paintBlackBiggerAvg',
		};
		
		this[methods[str]]();
	},
	
	displayInfo: function(){
		var imgData = this.getPreviewImageData(),
			obj = this.getImageDataInfo(imgData),
			halfHeight = imgData.height / 2,
			topPixels = [],
			bottomPixels = [];

		this.forEachPixel(imgData, function(pixel, _, y){
			var colorValue = App.averagePixel(pixel);
			(y < halfHeight ? topPixels : bottomPixels).push(colorValue);
		}, obj);

		// Exibir resultados na interface
		var result = this.html.result,
			fragment = document.createDocumentFragment(),
			list = this._create('ul');

		list.classList.add('featured-box');
		fragment.appendChild(list);

		var refLi = this._create('li', '<strong>Histograma da imagem:</strong>', list);
		refLi.appendChild(this._getHistogramComponent(obj.histogram));

		var topPixelsAvg = this._average(topPixels);
		this._create('li', `<strong>Média de cinza na metade superior da imagem:</strong> ${ topPixelsAvg.toFixed(2) }`, list);

		var bottomPixelsMedian = this._median(bottomPixels);
		this._create('li', `<strong>Mediana de cinza na metade inferior da imagem:</strong> ${ bottomPixelsMedian.toFixed(2) }`, list);

		var histogramMax = this._getHistogramMax(obj.histogram),
			indexes = obj.histogram.reduce(function(arr, value, index){
				if(value == histogramMax)
					arr.push(index);

				return arr;
			}, []),
			tmpStr = `<strong>Moda de cinza em toda a imagem:</strong> ${ indexes.join(', ') }`;
		tmpStr += ` (${ obj.histogram[indexes[0]] } aparições)`;
		this._create('li', tmpStr, list);

		var variance = this._variance(obj.allPixels);
		this._create('li', `<strong>Variância de cinza em toda a imagem:</strong> ${ variance.toFixed(2) }`, list);

		result.innerHTML = '';
		result.appendChild(fragment);
	},

	paintBlackBiggerAvg: function(){
		var imgData = this.getPreviewImageData(),
			obj = this.getImageDataInfo(imgData),
			avg = this._average(obj.allPixels),
			newImgData = this.previewContext.createImageData(imgData),
			blackPixel = [0, 0, 0, 255];

		this.forEachPixel(imgData, function(pixel, _, __, index){
			var colorValue = this.averagePixel(pixel),
				newPixel = colorValue >= avg ? blackPixel : pixel;

			this.setPixel(newImgData, index, newPixel);
		}, this);

		var canvas = this._createCanvasFromImageData(newImgData);
		this._replaceResultContent(canvas);
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

	_replaceResultContent: function(element){
		this.html.result.innerHTML = '';
		if(element)
			this.html.result.appendChild(element);
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
			var colorValue = App.averagePixel(pixel);
			this.histogram[colorValue]++;
			this.allPixels.push(colorValue);
		}, obj);

		return obj;
	},
	
	forEachPixel: function(imageData, callback, self){
		var data = imageData.data,
			width = imageData.width,
			height = imageData.height,
			pixelLength = 4;

		for(var y = 0; y < height; y++){
			var offset = pixelLength * width * y;
			for(var x = 0; x < width; x++){
				var index = pixelLength * x + offset;
				callback.call(self, data.slice(index, index + pixelLength), x, y, index);
			}
		}
	},

	averagePixel: function(pixel){
		return Math.round((pixel[0] + pixel[1] + pixel[2]) / 3);
	},

	setPixel: function(imgData, index, pixel){
		// Replaces the pixel at the right index of the ImageData object
		for(var data = imgData.data, len = pixel.length; len--;)
			data[index + len] = pixel[len];
	},

	_create: function(str, content, parentNode){
		var element = document.createElement(str);

		if(content)
			element.innerHTML = content;

		if(parentNode)
			parentNode.appendChild(element);

		return element;
	},

	_average: function(arr){
		return arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0;
	},

	_median: function(arr){
		arr = arr.slice().sort();
		var half = Math.floor(arr.length / 2);
		return arr.length % 2 ? arr[half] : (arr[half] + arr[half - 1]) / 2;
	},

	_variance: function(arr){
		var avg = this._average(arr);
		return arr.length > 1 ? arr.reduce((a, b) => a + Math.pow(b - avg, 2)) / (arr.length - 1): 0;
	},

	_getHistogramMax: function(arr){
		return Math.max.apply(Math, arr);
	},

	_getHistogramComponent: function(arr){
		var fragment = document.createDocumentFragment(),
			root = this._create('div', null, fragment),
			max = Math.ceil(this._getHistogramMax(arr) * 1.15);

		root.classList.add('histogram');
		this._create('span', arr.length, root).classList.add('histogram-max-x');
		this._create('span', '0', root).classList.add('histogram-min-x');
		this._create('span', max, root).classList.add('histogram-max-y');
		this._create('span', '0', root).classList.add('histogram-min-y');

		arr.forEach(function(value, index){
			var point = this._create('div', null, root),
				percentageX = index / arr.length * 100,
				percentageY = value / max * 100;

			point.classList.add('histogram-point');
			point.style.left = `${ percentageX.toFixed(4) }%`;
			point.style.top = `${ (100 - percentageY).toFixed(4) }%`;
		}, this);

		return fragment;
	}

};