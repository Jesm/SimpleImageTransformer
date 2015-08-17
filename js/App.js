var App={

	init:function(args){
		var buttons=args.sidebar.getElementsByTagName('button');
		for(var len=buttons.length;len--;)
			buttons[len].addEventListener('click', this._buttonClick);

		this.html={
			imageInfo:args.info
		};

		this._buildContent(args.content);
	},

	_buildContent:function(element){
		var fragment=document.createDocumentFragment();

		element.appendChild(fragment);
	},

	_buttonClick:function(){
		App.execute(this.dataset.action);
	},

	execute:function(str){

		switch(str){
		case 'display_info':

		break;
		}
	}
	
};