var SJS = function(params){
	var sjs = {}
	var tabspace = 4;
	var keys = ['key', 'name', 'message', 'arity', 'value', 
			'eval','loopval', 'step', 'declareStat',
			'first', 'second', 'third', 'fourth', 
			'from', 'to', 'line', 'at'];
	sjs.ioa = params.ioa || {
		print: function (output){
			var console = document.getElementById('CONSOLE');
			console.innerHTML += output;
			console.scrollTop = console.scrollHeight;
		},
		println: function (output){
			var console = document.getElementById('CONSOLE');
			console.innerHTML += output + '\n';
			console.scrollTop = console.scrollHeight;
		},
		inspect: function(obj){return JSON.stringify(obj, keys, tabspace);}
	}
	
	sjs.tokenizer =  tokenizer('=<>!+-*&|/%^~', '=<>&|+-*');
	sjs.parser = parser();
	sjs.interpreter = interpreter(sjs.ioa);

	sjs.go = function(source){
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
			sjs.ioa.println(e);
		}
		
	}
	
	return sjs;	
} 
