var App={

	init:function(args){
		this.loadedImage=false;
		this.html={
			input: args.input,
			imageInfo:args.info
		};
		
		var buttons=args.sidebar.getElementsByTagName('button');
		for(var len=buttons.length;len--;)
			buttons[len].addEventListener('click', this._buttonClick);
		
		this.html.input.addEventListener('change', this._uploadFile);

		this._buildContent(args.content);
	},

	_buildContent:function(element){
		var fragment=document.createDocumentFragment();
		
		this.html.preview=document.createElement('canvas');
		fragment.appendChild(this.html.preview);
		this.previewContext=this.html.preview.getContext('2d');

		element.appendChild(fragment);
	},

	_uploadFile:function(){
		if(this.files&&this.files.length){
			var file=this.files[0],
				img=new Image();
			
			img.onload=function(){
				App.loadPreviewImage(this);
			}
			img.src=URL.createObjectURL(file);
		}
	},

	_buttonClick:function(){
		App.execute(this.dataset.action);
	},
	
	loadPreviewImage:function(image){
		var preview=this.html.preview;
		
		preview.classList.add('active');
		preview.width=image.width;
		preview.height=image.height;
		
		this.previewContext.drawImage(image, 0, 0);
		
		this.loadedImage=true;
	},
	
	getPreviewImageData:function(){
		if(!this.loadedImage)
			throw "No image was uploaded!";
		
		var prev=this.html.preview;
		return this.previewContext.getImageData(0, 0, prev.width, prev.height);
	},

	execute:function(str){
		var methods={
			display_info: 'displayInfo'
		};
		
		this[methods[str]]();
	},
	
	displayInfo:function(){
		var imgData=this.getPreviewImageData();
	},
	
	getMultidimensionalImageData:function(imageData){
		
	}
	
};