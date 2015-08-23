var App = {

	init: function(args){
		this.loadedImage = false;
		this.html = {
			input: args.input,
			imageInfo: args.info
		};
		
		var buttons = args.sidebar.getElementsByTagName('button');
		for(var len = buttons.length;len--;)
			buttons[len].addEventListener('click', this._buttonClick);
		
		this.html.input.addEventListener('change', this._uploadFile);

		this._buildContent(args.content);
	},

	_buildContent: function(element){
		var fragment = document.createDocumentFragment();
		
		this.html.preview = document.createElement('canvas');
		fragment.appendChild(this.html.preview);
		this.previewContext = this.html.preview.getContext('2d');

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
	},
	
	getPreviewImageData: function(){
		if(!this.loadedImage)
			throw "No image was uploaded!";
		
		var prev = this.html.preview;
		return this.previewContext.getImageData(0, 0, prev.width, prev.height);
	},

	execute: function(str){
		var methods = {
			display_info: 'displayInfo'
		};
		
		this[methods[str]]();
	},
	
	displayInfo: function(){
		var prev = this.html.preview,
			imgData = this.getPreviewImageData(),
			obj = {
				halfHeight: imgData.height/2,
				histogram: new Array(256),
				topPixels: [],
			};

		for(var len = 256; len--;)
			obj.histogram[len] = 0;


		// Itera sobre todos os pixels, realizando as verificações necessárias
		this.forEachPixel(imgData, function(pixel, x, y){

			// var pixelGrayscale = Math.round((pixel[0] + pixel[1] + pixel[2]) / 3);
			var red = pixel[0];
			this.histogram[red]++;

			if(y < this.halfHeight)
				this.topPixels.push(red);

		}, obj);


		// Exibir resultados na interface
		var infoElement = this.html.imageInfo,
			list = this._create('ul'),
			adder = (a, b) => a + b;

		window.test = obj.topPixels;

		var topPixelsAvg = Math.round(obj.topPixels.reduce(adder) / obj.topPixels.length);
		this._create('li', '<strong>Média de cinza na metade superior:</strong> ' + topPixelsAvg, list);

		infoElement.innerHTML = '';
		infoElement.appendChild(list);
	},
	
	forEachPixel: function(imageData, callback, self){
		var data = imageData.data,
			width = imageData.width,
			height = imageData.height,
			pixelLength = 4;

		for(var y = 0; y < height; y++){
			var offset = pixelLength * width * y;
			for(var x = 0; x < width; x++){
				var index = offset + width * x;
				callback.call(self, data.slice(index, index + pixelLength), x, y);
			}
		}
	},

	_create:function(str, content, parentNode){
		var element = document.createElement(str);

		if(content)
			element.innerHTML = content;

		if(parentNode)
			parentNode.appendChild(element);

		return element;
	}
	
};