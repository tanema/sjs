var SJS = function(params){
	var sjs = {}
	var tabspace = 4;
	var keys = ['key', 'name', 'message', 'arity', 'value', 
			'eval','loopval', 'step', 'declareStat',
			'first', 'second', 'third', 'fourth', 
			'from', 'to', 'line', 'at'];
	
	var predefined = {
		functions: {
			print: function (output){
				var c = document.getElementById('CONSOLE');
				c.innerHTML += output;
				c.scrollTop = console.scrollHeight;
			},
			println: function (output){
				var c = document.getElementById('CONSOLE');
				c.innerHTML += output + '\n';
				c.scrollTop = console.scrollHeight;
			},
			inspect: function(obj){
				return JSON.stringify(obj, keys, tabspace);
			}
		},
		constants: {
			SJSAuthor: "Tim Anema"
		}
	}
	//import user variables it is ok to overwrite if they want to
	if(params.preDefined){
        if(params.preDefined.functions)
            for(var x in params.preDefined.functions)
                predefined.functions[x] = params.preDefined.functions[x];
        if(params.preDefined.constants)
            for(var x in params.preDefined.constants)
                predefined.constant[x] = params.preDefined.constants[x];
    }
	
	sjs.tokenizer =  tokenizer('=<>!+-*&|/%^~', '=<>&|+-*');
	sjs.parser = parser(predefined);
	sjs.interpreter = interpreter(predefined.functions);

	sjs.go = function(source){
		if(params.debug)
			document.getElementById('ASTOUTPUT').innerHTML = ""
		try{
			var tokens = sjs.tokenizer(source);
			var parseTree = sjs.parser(tokens);
			sjs.interpreter(parseTree);
			if(params.debug){
				try{parseTreestring = JSON.stringify(parseTree, keys, tabspace);}
				catch(e){parseTreestring = e}
				document.getElementById('ASTOUTPUT').innerHTML = parseTreestring.replace(/&/g, '&amp;').replace(/[<]/g, '&lt;');
			}
		}catch(e){
			predefined.functions.println(e);
		}
		
	}
	
	return sjs;	
} 
