/*
	interpreter.js
	By Tim Anema 2010
*/
this.interpreter = function (preDefinedFunctions) {
	//========================scoping definitions========================
	var scope;
    var symbol_table = {};
	var scope_arity = ['global','function','loop','if'];
	
	var error = function (message, t,errorNum) {
		var errString = "===========Interpeter Interupted=============\n";
        errString += "Interpret Error\n";
        errString += message+" "+t.id+"\n";
        errString += "ERROR CODE: " + errorNum+"\n";
        if(t['value']){
            errString += "On " +  t['value'] + " " + t['arity']+"\n";
            errString += "At Line: " + t['line'] + ", char : " + t['at']+"\n";
        }
        errString += "=========================================";
        throw errString;
	};
	
	var createObj = function (o){
		function F(){}
		F.prototype = o;
		return new F();
	}
	
	var make = function (o, val) {// Make a token object.
        return {
            value: 	o['value'],
			name:	o['name'],
			arity:	o['arity'],
			first:	o['first'],
			second:	o['second'],
			eval:	val || o['eval'],
            from: 	o['from'],
            to: 	o['i'],
			line: 	o['line'],
			at:		o['at']
        };
    };
	
	var itself = function () {
        return this;
    };

    var original_scope = {
        define: function (n, id) {
            this.def[id || n.value]	= n;
            n.scope    			= scope;
            return n;
        },
        find: function (n) {
            var e = this, o;
            while (true) {
                o = e.def[n.value];
                if (o && typeof o !== 'function') {
                    return e.def[n.value];
                }
                e = e.parent;
                if (!e) {
                    o = symbol_table[n];
                    return o && typeof o !== 'function' ?
                            o : symbol_table["(name)"];
                }
            }
        },
        pop: function () {
			scope = this.parent;
        }
    };

    var new_scope = function (arity) {
        var s = scope;
        scope = createObj(original_scope);
        scope.def = {};
        scope.parent = s;
		scope.arity = arity;
        return scope;
    };
	
	//==================================Readability Functions======================================
	//returndef returns undefined if break so that the break does not propagate up through scopes
	function ReturnDef(returnVal){return (returnVal && (returnVal['value'] === 'return')) ? returnVal:undefined;}
	function isBreakOrReturn(returnVal){return (returnVal && (returnVal['value'] === 'return' || returnVal['value'] === 'break'));}
	
	//======================Stat definitions====================
	
	function functionStat(currentItem){
		if(currentItem.value == 'function') 
			return scope.define(make(currentItem, currentItem),currentItem['name']);
		else if(preDefinedFunctions[currentItem.value]){
			var arr=[],i;
			for(i=0;i<currentItem['first'].length;i++){
				console.log(currentItem['first'][i])
				arr.push(stat(i,currentItem['first']));	
			} 
			return preDefinedFunctions['println'].apply(this||window,arr);
		}
		else
			error("undefined function",currentItem,3099);
	}
	
	function unaryStat(currentItem){
		switch(currentItem['value']){
			case '-':	return -1 * stat('first', currentItem);
			case '!':	
			case 'not': return !Boolean(stat('first', currentItem));
			case 'typeof': 
				var v = stat('first', currentItem)
				return typeof v;
			case '~':	
				var n = stat('first', currentItem);
				return ~n;
			case '[':
				var arr=[],i;
				for(i=0;i<currentItem['first'].length;i++) arr.push(stat(i,currentItem['first']));
				return arr;
			case '{':
				var arr=[],i;
				for(i=0;i<currentItem['first'].length;i++)
					arr[currentItem['first'][i]['key']] = make(currentItem['first'][i]['key'], stat(i,currentItem['first']));
				return arr;
			default:	error("undefined unary",currentItem,3120);
		}
	}

	function dotStat(currentItem){
		var first = stat('first', currentItem),
			second = stat('second', currentItem);
		if(first[second]){
			return first[second];
		}else{
			first[second] = make(currentItem['second']);
			return first[second];
		}
	}
	
	function binaryStat(currentItem){
		switch(currentItem['value']){
			case '-':
			case '/':
			case '*':
			case '%':
			case '**':
			case '&':
			case '|':
			case '^':
			case '<<':
			case '>>':	return op(currentItem);
			case '=':
			case '+=':
			case '-=':
			case '*=':
			case '/=':	return assignmentStat(currentItem);
			case '(':	return funcEval(currentItem);
			case '.':   return dotStat(currentItem);
			case '[':	return stat('first', currentItem)[stat('second', currentItem)];
			case '>=':
			case '=>':	return stat('first', currentItem) >= stat('second', currentItem);
			case '<=':
			case '=<':	return stat('first', currentItem) <= stat('second', currentItem);
			case '+':	return stat('first', currentItem) + stat('second', currentItem);
			case 'is':
			case '==':	return stat('first', currentItem) == stat('second', currentItem);
			case '===':	return stat('first', currentItem) === stat('second', currentItem);
			case '!=':	return stat('first', currentItem) != stat('second', currentItem);
			case '!==':	return stat('first', currentItem) !== stat('second', currentItem);
			case '>':	return stat('first', currentItem) > stat('second', currentItem);
			case '<':	return stat('first', currentItem) < stat('second', currentItem);
			case 'and':
			case '&&':	return stat('first', currentItem) && stat('second', currentItem);
			case "or":
			case '||':	return stat('first', currentItem) || stat('second', currentItem);
			default:	error("undefined Operator",currentItem,3157);
		}
	}
	
	function op(currentItem){
		var first = stat('first', currentItem);
		var second = stat('second', currentItem);
		if(typeof first === typeof second){
			switch(currentItem['value']){
				case '-':	return first - second;
				case '/':	return first / second;
				case '*':	return first * second;
				case '%':	return first % second;
				case '**':	return Math.pow(first,second);
				case '&':	return first & second;
				case '|':	return first | second;
				case '^':	return first ^ second;
				case '<<':	return first << second;
				case '>>':	return first >> second;
			}
		}
		error("Type Mismatched",currentItem,3178);
	}
	
	function assignmentStat(currentItem){
		var first = stat('first', currentItem);//stat finds the variable
		var second = stat('second', currentItem);
		if(currentItem['value'] === '='){
			first.eval = second;
			return first.eval;
		}
		else if(typeof first.eval === typeof second){
				 if(currentItem['value'] === '+=')	first.eval += second;
			else if(currentItem['value'] === '/=')	first.eval /= second;
			else if(currentItem['value'] === '*=')	first.eval *= second;
			else if(currentItem['value'] === '-=')	first.eval -= second;
			return first.eval;
		}
		else
			error("Type Mismatched",currentItem,3194);
	}
	
	function funcEval(currentItem){
		var func = stat('first',currentItem);//currentItem['first']['eval'];
		var	parameters = func['first'],retVal,n;
		//make and define functions when declared
		//dont put eval in parser and put eval of func only in scope def
		// func = look up definition
		
		new_scope(scope_arity[1]);
			for (value in parameters){	//make parameters 
				e = stat(value, currentItem['second']);
				n = make(parameters[value],'');
				n.eval = e;
				scope.define(n);
			}
			retVal = stat('second',func);
			if(retVal && retVal['value'] === 'break')
				error("illegal break statment",currentItem,3207);
			retVal = retVal ? stat('first',retVal):undefined;
		scope.pop();
		return retVal;
	}
	
	function ternaryStat(currentItem){
		switch(currentItem['value']){
			case '?': 	return stat('first',currentItem) ? stat('second',currentItem):stat('third',currentItem);
			default:	error("undefined ternary",currentItem,3216);
		}
	}
	
	function statementStat(currentItem){
		switch(currentItem['value']){
			case 'for':		
			case 'foreach':	
			case 'from':	
			case 'while':	
			case 'if':		
			case 'switch':
			case 'new':	
			case 'var':		return eval(currentItem['value']+'Stat')(currentItem);
			case 'return':
			case 'break':	return currentItem
			default:		error("undefined statement",currentItem,3231);
		}
	}
	
	function forStat(loop){
		var n,from,to,start,loopval,
		value = stat('first', loop),
		step = stat('step', loop);
		if(parseInt(value) === value){
			new_scope(scope_arity[2]);
				if(loop['loopval']){
					n = scope.define(make(loop['loopval']));
					n.eval = value;
				}
				value = value > 0 ? value-1:value+1;
				step = (step && step != 0) ? step : (value > 0 ? 1:-1);
				if((value >= 0 && step > 0) || (value < 0 && step < 0)){
					from = value;
					to = 0;
				}else if((value >= 0 && step < 0) || (value < 0 && step > 0)){
					from = 0;
					to = value;
				}
				loopval = handleReturnsAndBreaks(loop, iterativeLoopStat(loop,from,to,step,n,value));
			scope.pop();
		}else
			error("Type Mismatched: Expected int in for statement but found " + (typeof value),loop,3257);
		return ReturnDef(loopval);
	}
	
	function fromStat(loop){
		var loopval,n,start,
		from = stat('first', loop['first']),
		to = stat('second', loop['first']),
		step = stat('step', loop);
		if(parseInt(from) === from && parseInt(to) === to){
			new_scope(scope_arity[2]);
				if(loop['loopval']){
					n = scope.define(make(loop['loopval']));
					n.eval = from;
				}
				step = (step && step != 0) ? step : from < to ? 1:-1;
				loopval = handleReturnsAndBreaks(loop, iterativeLoopStat(loop,from,to,step,n));
			scope.pop();
		}else
			error("Type Mismatched: Expected int in from statement but found " 
								+ (typeof from) + " and " + (typeof to),loop,3276);
		return ReturnDef(loopval);
	}
	
	function iterativeLoopStat(loop,from,to,step,loopval,value){
		var returnVal = undefined;
		if((from <= to && step > 0) || (from >= to && step < 0)){
			start = from;
			for(;((start < to) ? (from <= to):(to <= from)); from+=step){
				if (loopval) loopval.eval = from;
				returnVal = stat('second', loop);
				if(value) value = stat('first', loop);
				if(isBreakOrReturn(returnVal))
					break;
			}
		}
		else if((from > to && step > 0) || (from < to && step < 0)){
			start = to;
			for(;((start < from) ? (to <= from):(from <= to)); to+=step){
				if (loopval) loopval.eval = to;
				returnVal = stat('second', loop);
				if(value) value = stat('first', loop);
				if(isBreakOrReturn(returnVal))
					break;
			}
		}
		return returnVal;
	}
	
	function foreachStat(loop){
		var n, loopval = undefined,
		inVal = scope.define(make(loop['first']['first'])),
		arrVal = stat('second', loop['first']);
		new_scope(scope_arity[2]);
			if(loop['loopval']){
				n = scope.define(make(loop['loopval']));
				n.eval = inVal.eval;
			}
			for (inVal.eval in arrVal){ 
				if(loop['loopval']) n.eval = inVal.eval;//I dont know why I implimented this continuity I guess
				loopval = handleReturnsAndBreaks(loop, stat('second', loop));
				if(isBreakOrReturn(loopval))
					break;
			}
		scope.pop();
		return ReturnDef(loopval);
	}
	
	function whileStat(loop){
		var loopval = undefined,n,value = stat('first', loop),asVal;
		if(typeof value === 'boolean'){
			new_scope(scope_arity[2]);
				if(loop['loopval']){
					n = scope.define(make(loop['loopval']));
					n.eval = value;
				}
				while(value){
					loopval = handleReturnsAndBreaks(loop, stat('second', loop));
					asVal = n ? n.eval : true;
					value = stat('first', loop) && asVal;
					if(isBreakOrReturn(loopval))
						break;
				}
			scope.pop();
		}else
			error("Type Mismatched: Expected bool in while statement but found " + (typeof value),loop,3342);
		return ReturnDef(loopval)
	}
	
	function ifStat(ifItem){
		var ifblockValue,value = stat('first', ifItem);
		if(typeof value === 'boolean'){
			if(value){
				new_scope(scope_arity[3]);
					ifblockValue = handleReturnsAndBreaks(ifItem, stat('second', ifItem)); 
				scope.pop();
				return ifblockValue;
			}else if(ifItem['third'])
				return stat('third', ifItem);
		}else
			error("Type Mismatched: Expected bool in if statement but found " + (typeof value),ifItem,3357);
	}
	
	function switchStat(currentItem){
		var switchVal = stat('first', currentItem),
		cases = currentItem['second'], caseTrue = false,
		returnVal = undefined;
		new_scope(scope_arity[2]);
			for(var i = 0; i < cases.length; i++){
				if(caseTrue){
					returnVal = handleReturnsAndBreaks(currentItem, stat('second', cases[i]));
				}else if(switchVal == stat('first', cases[i]) || cases[i]['value'] == 'default'){
					returnVal = handleReturnsAndBreaks(currentItem, stat('second', cases[i]));
					caseTrue = true;
				}
				if(isBreakOrReturn(returnVal))
					break;
			}
		scope.pop();
		return ReturnDef(returnVal);
	}
	
	function varStat(currentItem){scope.define(make(currentItem['first'],stat('second', currentItem)));	}
	
	function newStat(currentItem){
		try {
			var i = new Object.create(stat('first', currentItem));
			return i;
		}catch(e){
			console.log(e)
			error(e.message,currentItem,3099);
		} 
	}

	function thisStat(currentItem){
		switch(currentItem['value']){
			default:	error("undefined this stat",currentItem,3387);
		}
	}
	
	function stat(key, holder) {
        var i,currentItem = holder[key];
        if (currentItem && typeof currentItem == 'object') {
			if (Object.prototype.toString.apply(currentItem) === '[object Array]') {
				var retVal, length = currentItem.length;
				for (i = 0; i < length; i += 1){
					retVal = stat(i, currentItem) || 'null';
					if(retVal && (retVal['value'] === 'return' || retVal['value'] === 'break'))
						return retVal;
				}
			}else{
				switch (currentItem['arity']){
					case 'function': 
					case 'binary': 
					case 'unary': 
					case 'statement': 
					case 'this': 
					case 'ternary': return eval(currentItem['arity']+'Stat')(currentItem);
					case 'literal': return currentItem['value'];
					case 'name': 	return (n = scope.find(currentItem)) ? n['eval'] : error("Undefined Item",currentItem,3410); 
				}
			}
		}else
			return currentItem;
    }
	
	function handleReturnsAndBreaks(statementValue, returnValue){
		if(returnValue && (returnValue['value'] === 'return' || returnValue['value'] === 'break')){
			var canBreak = ['for','foreach','from','while','switch'],
			isReturn = (returnValue && returnValue['value'] === 'return'),
			s = scope,a;
			if(canBreak.indexOf(statementValue['value']) > -1 && !isReturn)
				return returnValue;
			else if(statementValue['value'] == 'if' && !isReturn)
				a = scope_arity[2];//loop arity
			else
				a = scope_arity[1];//function arity
				
			while(s){
				if(s.arity == a)break;
				s = s.parent;
			}
			if(s) return returnValue;
			error(isReturn ? "illegal return statement":"illegal break statment",statementValue,3434);
		}
	}
	
	return function (parseTree) {	
		new_scope(scope_arity[0]);
			scope.define({
	            value: 	'test',
				name:	'test',
				arity:	'name',
				eval:	2
	        });
			stat('', {'': parseTree});
		scope.pop();
	};
}
