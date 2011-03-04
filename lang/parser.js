/* 
 parser.js
 Core Design and Credit go to Douglas Crockford
 http://javascript.crockford.com/tdop/index.html
 
 Also by Tim Anema 2010
*/

this.parse = (function () {
    var scope;
    var symbol_table = {};
	var reservedWords = {}; 
    var token;
    var tokens;
    var token_nr;
	
	var scope_string = "";
	
	var error = function (message, t,errorNum) {
		t.name = "SyntaxError";
		t.message = message;
		t.errorNum = errorNum;
		t.error_code = 1;
		throw t;
	};
	
	var createObj = function (o){
		function F(){}
		F.prototype = o;
		return new F();
	}

    var itself = function () {
        return this;
    };

    var original_scope = {
        define: function (n) {
            if(reservedWords[n.value]){
				error("Reserved Word, Cannot Redfine",n, 2040);
			}else if (typeof this.def[n.value] === "object") {
                error("Already defined item:",n, 2042);
            }
            this.def[n.value] = n;
            n.reserved = false;
            n.nud      = itself;
            n.led      = null;
            n.std      = null;
            n.lbp      = 0;
            n.scope    = scope;
			scope_string += n.value + ",";
            return n;
        },
        find: function (n) {
            var e = this, o;
            while (true) {
                o = e.def[n];
                if (o && typeof o !== 'function') {
                    return e.def[n];
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
			if(scope_string[scope_string.length - 1] === ',')
				scope_string = scope_string.substr(0,scope_string.length - 1) + '],';
			else
				scope_string += ']';
			scope = this.parent;
        },
        reserve: function (n) {
            if (n.arity !== "name" || n.reserved) {
                return;
            }
            var t = this.def[n.value];
            if (t) {
                if (t.reserved) {
                    return;
                }
                if (t.arity === "name") {
                    error("Already defined item:",n, 2086);
                }
            }
            this.def[n.value] = n;
			reservedWords[n.value] = n
			scope_string += n.value + ",";
            n.reserved = true;
        }
    };

    var new_scope = function () {
		scope_string += "[";
        var s = scope;
        scope = createObj(original_scope);
        scope.def = {};
        scope.parent = s;
        return scope;
    };

    var advance = function (id) {
        var a, o, t, v;
        if (id && token.id !== id) {
            error("Expected '" + id + "' and found",token, 2108);
        }
        if (token_nr >= tokens.length) {
            token = symbol_table["(end)"];
            return;
        }
        t = tokens[token_nr];
        token_nr += 1;
        v = t.value;
        a = t.type;
        if (a === "name") {
            o = scope.find(v);
        } else if (a === "operator") {
            o = symbol_table[v];
            if (!o) {
                error("Unknown operator:",t,2123);
            }
        } else if (a === "string" || a ===  "number") {
            o = symbol_table["(literal)"];
            a = "literal";
        } else {
            error("Unexpected token:",t,2129);
        }
        token = createObj(o);
        token.from  = t.from;
        token.to    = t.to;
		token.line  = t.line;
		token.at	= t.at;
        token.value = v;
        token.arity = a;
        return token;
    };

    var expression = function (rbp) {
        var left;
        var t = token;
        advance();
        left = t.nud();
        while (rbp < token.lbp) {
            t = token;
            advance();
            left = t.led(left);
        }
        return left;
    };

    var statement = function () {
        var n = token, v;

        if (n.std) {
            advance();
            scope.reserve(n);
            return n.std();
        }
        v = expression(0);
        if (!v.assignment && v.id !== "(") {
            error("Bad expression statement.",v,2164);
        }
        advance(";");
        return v;
    };

    var statements = function () {
        var a = [], s;
        while (true) {
            if (token.id === "}" || token.id === "(end)") {
                break;
            }
            s = statement();
            if (s) {
                a.push(s);
            }
        }
        return a.length === 0 ? null : a.length === 1 ? a[0] : a;
    };

    var block = function () {
        var t = token;
		if(token.id == "{"){
			advance();
			return t.std();
		}else{
			new_scope();
			var a = statement();
			scope.pop()
			return a;
		}
    };

    var original_symbol = {
        nud: function () {
            error("Undefined token:" + this.value,this,2192);
        },
        led: function (left) {
            error("Missing operator found at",this,2195);
        }
    };

    var symbol = function (id, bp) {
        var s = symbol_table[id];
        bp = bp || 0;
        if (s) {
            if (bp >= s.lbp) {
                s.lbp = bp;
            }
        } else {
            s = createObj(original_symbol);
            s.id = s.value = id;
            s.lbp = bp;
            symbol_table[id] = s;
        }
        return s;
    };

    var constant = function (s, v) {
        var x = symbol(s);
        x.nud = function () {
            scope.reserve(this);
            this.value = symbol_table[this.id].value;
            this.arity = "literal";
            return this;
        };
        x.value = v;
        return x;
    };

    var infix = function (id, bp, led) {
        var s = symbol(id, bp);
        s.led = led || function (left) {
            this.first = left;
            this.second = expression(bp);
            this.arity = "binary";
            return this;
        };
        return s;
    };

    var infixr = function (id, bp, led) {
        var s = symbol(id, bp);
        s.led = led || function (left) {
            this.first = left;
            this.second = expression(bp - 1);
            this.arity = "binary";
            return this;
        };
        return s;
    };

    var assignment = function (id) {
        return infixr(id, 10, function (left) {
            if (left.id !== "." && left.id !== "[" && left.arity !== "name") {
                error("Bad lvalue:",left,2252);
            }
            this.first = left;
            this.second = expression(9);
            this.assignment = true;
            this.arity = "binary";
            return this;
        });
    };

    var prefix = function (id, nud) {
        var s = symbol(id);
        s.nud = nud || function () {
            scope.reserve(this);
            this.first = expression(70);
            this.arity = "unary";
            return this;
        };
        return s;
    };

    var stmt = function (s, f) {
        var x = symbol(s);
        x.std = f;
        return x;
    };
	
	//------------------------------ custom methods ------------------------------------
	var loopBlock = function (loop) {
		if (token.id === "as"){
			new_scope();
			advance("as");advance("|");
			n = token;
			scope.define(n);
			loop.loopval = n;
			advance("(name)");advance("|");advance("do");
			loop.second = (function () {
				if(token.id == "{"){
					advance();
					var a = statements();
					//wierd scoping bug meant scope pop had to be moved here ?? havnt figured it out yet
					scope.pop(); 
					advance("}");
					return a;
				}else{
					new_scope();
					var a = statement();
					scope.pop()
					return a;
				}
			})();
			loop.arity = "statement";
			return loop;
		} else if (token.id === "do"){
			advance("do");
			loop.second = block();
			loop.arity = "statement";
			return loop;
		}else{
			error("Expected 'as' or 'do' statement but recieved:",token,2304);
		}
	}
	
	var switchBlock = function (loop) {
		advance("{");
		new_scope();
        var a = caseStatements();
        advance("}");
        scope.pop();
        return a;
	}
	
	var caseStatements = function () {
        var a = [], s;
        while (true) {
            if (token.id === "}" || token.id === "(end)") {
                break;
            }
            s = caseStatement();
            if (s) {
                a.push(s);
            }
        }
        return a.length === 0 ? null : a.length === 1 ? a[0] : a;
    };
	
	var caseStatement = function () {
        var n = token;
        if (n.id === "case" || n.id === "default") {
            advance();
            scope.reserve(n);
            return n.std();
        }else{
			error("Expected 'case' or 'default' statement but recieved '" + n.id + "'",token, 2338);
		}
    };
	
	/**
	|===============================================================================================|
	|-----------------------------------------------------------------------------------------------|
	|					Start Language specifications here there are a couple types					|
	|					1. symbol					5. prefix										|
	|					2. constant					6. stmt											|
	|					3. assignment																|
	|					4. infix/infixr(right assoc)												|
	|-----------------------------------------------------------------------------------------------|
	|===============================================================================================|
	*/

	//---------------------- SYMBOL DEFINITIONS ----------------------
    symbol("(end)");
    symbol("(name)");
    symbol(":");
    symbol(";");
    symbol(")");
    symbol("]");
    symbol("}");
    symbol(",");
	symbol("|");
    symbol("do");
	symbol("times");
	symbol("else");
	symbol("as");
	symbol("catch");
	symbol("finally");
	symbol("by");
	symbol("in");
	symbol("(literal)").nud = itself;
    symbol("this").nud = function () {
        scope.reserve(this);
        this.arity = "this";
        return this;
    };

	//---------------------- CONSTANTS DEFINITIONS ----------------------
    constant("true", true);
    constant("false", false);
    constant("null", null);
	constant("undefined", undefined);
    constant("pi", 3.141592653589793);
    constant("Object", {});
    constant("Array", []);

    
	//---------------------- ASSIGNMENT DEFINITIONS ----------------------
    assignment("=");
    assignment("+=");
    assignment("-=");
	assignment("/=");
    assignment("*=");

	//---------------------- INFIX DEFINITIONS ----------------------
    infix("?", 20, function (left) {
        this.first = left;
        this.second = expression(0);
        advance(":");
        this.third = expression(0);
        this.arity = "ternary";
        return this;
    });
	
	infix("to", 20, function (left) {
        this.first = left;
        this.second = expression(0);
        this.arity = "binary";
        return this;
    });
	
	infix("in", 20, function (left) {
		this.first = left;
		this.second = expression(0);
		this.arity = "binary";
		return this;
    });

    infixr("&&", 30);
	infixr("and", 30);
    infixr("||", 30);
	infixr("or", 30);

    infixr("===", 40);
    infixr("!==", 40);
    infixr("==", 40);
	infixr("is", 40);
    infixr("!=", 40);
    infixr("<", 40);
	infixr(">", 40);
    infixr("<=", 40);
    infixr("=<", 40);
    infixr(">=", 40);
	infixr("=>", 40);
	
    infix("+", 50);
    infix("-", 50);

    infix("*", 60);
	infix("**", 60);
    infix("/", 60);
	infix("%", 60);
	
	infix("^", 60);
	infix("|", 60);
	infix("&", 60);
	infix("<<", 60);
	infix(">>", 60);

    infix(".", 80, function (left) {
        this.first = left;
        if (token.arity !== "name") {
            error("Expected a property name at:",token,2453);
        }
        token.arity = "literal";
        this.second = token;
        this.arity = "binary";
        advance();
        return this;
    });
	
    infix("[", 80, function (left) {
        this.first = left;
        this.second = expression(0);
        this.arity = "binary";
        advance("]");
        return this;
    });
	
    infix("(", 80, function (left) {
        var a = [];
        if (left.id === "." || left.id === "[") {
            this.arity = "ternary";
            this.first = left.first;
            this.second = left.second;
            this.third = a;
        } else {
            this.arity = "binary";
            this.first = left;
            this.second = a;
            if ((left.arity !== "unary" || left.id !== "function") &&
                    left.arity !== "name" && left.id !== "(" &&
                    left.id !== "&&" && left.id !== "||" && left.id !== "?") {
                error("Expected a variable name, found",left,2484);
            }
        }
        if (token.id !== ")") {
            while (true)  {
                a.push(expression(0));
                if (token.id !== ",") {
                    break;
                }
                advance(",");
            }
        }
        advance(")");
        return this;
    });


	//---------------------- PREFIX DEFINITIONS ----------------------
    prefix("!");
	prefix("not");
    prefix("-");
	prefix("~");
    prefix("typeof");

    prefix("(", function () {
        var e = expression(0);
        advance(")");
        return e;
    });

    prefix("function", function () {
        var a = [],n;
        if (token.id == "(name)") {
            n = scope.define(token);
            this.name = token.value;
            advance();
        }
		new_scope();
        advance("(");
        if (token.id !== ")") {
            while (true) {
                if (token.arity !== "name") {
                    error("Expected a parameter name, found",token,2525);
                }
                scope.define(token);
                a.push(token);
                advance();
                if (token.id !== ",") {
                    break;
                }
                advance(",");
            }
        }
        this.first = a;
        advance(")");
        advance("{");
        this.second = statements();
        advance("}");
        this.arity = "function";
        scope.pop();
        return this;
    });

    prefix("[", function () {
        var a = [];
        if (token.id !== "]") {
            while (true) {
                a.push(expression(0));
                if (token.id !== ",") {
                    break;
                }
                advance(",");
            }
        }
        advance("]");
        this.first = a;
        this.arity = "unary";
        return this;
    });

    prefix("{", function () {
        var a = [], n, v;
        if (token.id !== "}") {
            while (true) {
                n = token;
                if (n.arity !== "name" && n.arity !== "literal") {
                    error("Bad property name",token,2570);
                }
                advance();
                advance(":");
                v = expression(0);
                v.key = n.value;
                a.push(v);
                if (token.id !== ",") {
                    break;
                }
                advance(",");
            }
        }
        advance("}");
        this.first = a;
        this.arity = "unary";
        return this;
    });


	//---------------------- STMT DEFINITIONS ----------------------
    stmt("{", function () {
        new_scope();
        var a = statements();
        advance("}");
        scope.pop();
        return a;
    });

    stmt("var", function () {
        var a = [], n, t,l;
		this.arity = "statement";
        while (true) {
            n = token;
            if (n.arity !== "name") {
                error("Expected a new variable name, found",n,2605);
            }
            scope.define(n);
			l = createObj(this);
			l.first = n;
            advance();
            if (token.id === "=") {
                advance("=");
				l.second = expression(0);
            }
			a.push(l);
            if (token.id !== ",") {
                break;
            }
            advance(",");
        }
        advance(";");
        return a.length === 0 ? null : a.length === 1 ? a[0] : a;
    });

    stmt("if", function () {
        this.first = expression(0);
        this.second = block();
        if (token.id === "else") {
            scope.reserve(token);
            advance("else");
            this.third = token.id === "if" ? statement() : block();
        } else {
            this.third = null;
        }
        this.arity = "statement";
        return this;
    });

    stmt("return", function () {
        if (token.id !== ";") {
            this.first = expression(0);
        }
        advance(";");
        this.arity = "statement";
        return this;
    });

    stmt("break", function () {
        advance(";");
        this.arity = "statement";
        return this;
    });

    stmt("while", function () {
        this.first = expression(0);
        return loopBlock(this);
    });
	
	stmt("for", function () {
		if(token.value == "each"){//for each statement
			this.value += token.value;
			advance();
			new_scope();
				token.nud = function () {
					scope.define(this);
					return this;
				};
				this.first = expression(0);
				var retVal = loopBlock(this);
			scope.pop();
			return retVal;
		}
        this.first = expression(0);
		advance("times");
		if(token.id == "by"){
			advance("by");
			this.step = expression(0);
		}
		return loopBlock(this);
    });
	
	stmt("from", function () {
        this.first = expression(0);
		if(token.id == "by"){
			advance("by");
			this.step = expression(0);
		}
		return loopBlock(this);
    });
	
	stmt("try", function () {// this is a big TODO
        this.first = block();
		advance("catch");
		this.second = block();
		if (token.id === "finally") {
            scope.reserve(token);
            advance("finally");
            this.third = block();
        } else {
            this.third = null;
        }
		this.arity = "statement";
		return this;
    });
	
	stmt("switch", function () {
        this.first = expression(0);
		this.second = switchBlock(this);
		this.arity = "statement";
		return this;
    });
	
	stmt("case", function () {
        var a = []
		var n = token, v;
		advance("(literal)");advance(":");
		this.first = n;
		while(true) {//break statements should be taken care of by expression
            if (token.id === "default" || token.id === "case" || token.id === "}") { 
                break;
            }
            s = statement();
            if (s) {
                a.push(s);
            }
        }
		this.second = a.length === 0 ? null : a.length === 1 ? a[0] : a;
		this.arity = "statement";
        return this;
    });
	
	stmt("default", function () {
        var a = []
		var n = token, v;
		advance(":");
		this.first = n;
		while(true) {//break statements should be taken care of by expression
            if (token.id === "}") { 
                break;
            } else if (token.id === "default" || token.id === "case"){
				error("unexpected  '" + n.id + "' statement",token,2748);
			}
            s = statement();
            if (s) {
                a.push(s);
            }
        }
		this.second = a.length === 0 ? null : a.length === 1 ? a[0] : a;
		this.arity = "statement";
        return this;
    });
	
	stmt("function", function () {
        var a = [], n;
		if (token.id == "(name)") {
            n = scope.define(token);
            this.name = token.value;
            advance();
        }
        new_scope();
        advance("(");
        if (token.id !== ")") {
            while (true) {
                if (token.arity !== "name") {
                    error("Expected a parameter name, found",token,2772);
                }
                scope.define(token);
                a.push(token);
                advance();
                if (token.id !== ",") {
                    break;
                }
                advance(",");
            }
        }
        this.first = a;
        advance(")");
        advance("{");
        this.second = statements();
        advance("}");
        this.arity = "function";
        scope.pop();
        return this;
    });
	
	stmt("print", function () {
        var a = [], n, t;
		this.first = expression(0);
		this.arity = "function";
		advance(";");
        return this;
    });
	
	stmt("println", function () {
        var a = [], n, t;
		this.first = expression(0);
		this.arity = "function";
		advance(";");
        return this;
    });
	
	//---------------------- END OF DEFINITIONS ---------------------- 
    return function (TokenStream) {
		scope_string = "";
        tokens = TokenStream;
        token_nr = 0;
        
		new_scope(); //scope around program so its not on the same level as reserved words 
			advance();
				var s = statements();
			advance("(end)");
        scope.pop();
		
        return s;
    };
})();
