/* 
 tokenizer.js
 2009-05-17

 (c) 2006 Douglas Crockford
		additions by Tim Anema 2010/2011
			-line numbers in errors mucho helpful
			-extended comments
			-at index in errors also mucho helpful
			-error and create were converted from prototypes because they
			really didnt need to be and they confused jquery
			
 Produce an array of simple token objects from a string.
 A simple token object contains these members:
      type: 'name', 'string', 'number', 'operator'
      value: string or number value of the token
      from: index of first character of the token
      to: index of the last character + 1

 Comments of the // and the type this is in are ignored. 

 Operators are by default single characters. Multicharacter
 operators can be made by supplying a string of prefix and
 suffix characters.
 characters. For example,
      '<>+-&', '=>&:'
 will match any of these:
      <=  >>  >>>  <>  >=  +: -: &: &&: &&
*/

this.tokenize = function (source, prefix, suffix) {
    var c;                      // The current character.
    var from;                   // The index of the start of the token.
    var i = 0;                  // The index of the current character.
    var length = source.length;
    var n;                      // The number value.
    var q;                      // The quote character.
    var str;                    // The string value.
	var line = 1;				// The Line Index 
	var at = 0;

    var result = [];            // An array to hold the results.

	var error = function (message, t, errorNum) {
		t.name = "Token Error";
		t.message = message;
		t.errorNum = errorNum;
		t.error_code = 1;
		throw t;
	};

    var make = function (type, value) {// Make a token object.
        return {
            type: 	type,
            value: 	value,
            from: 	from,
            to: 	i,
			line: 	line,
			at:		at
        };
    };
	
	var thisref = source;
	var advance = function (n) {
		i += (n > -1) ? n:1;
		at += (n > -1) ? n:1;
		c = thisref.charAt(i);
		if(c === '\n' || c === '\r'){
			line++;
			at = 0;
		}
	}

	// Begin tokenization. If the source string is empty, return nothing.
    if (!source) {
        return;
    }

	// If prefix and suffix strings are not provided, supply defaults.
    if (typeof prefix !== 'string') {
        prefix = '<>+-&';
    }
    if (typeof suffix !== 'string') {
        suffix = '=>&:';
    }

	
    advance(0);
    while (c) {// Loop through this text, one character at a time.
        from = i;
        if (c <= ' ') {// Ignore whitespace.
            advance();
        } else if (c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z') {// name.
            str = c;
            for (;;) {
                advance();
				if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                        (c >= '0' && c <= '9') || c === '_') {
                    str += c;
                } else {
                    break;
                }
            }
            result.push(make('name', str));
        } else if (c >= '0' && c <= '9') {// number.cannot start with a decimal point. It must start with a digit,possibly '0'.
            str = c;
            for (;;) {// Look for more digits.
                advance();
                if (c < '0' || c > '9') {
                    break;
                }
                str += c;
            }
            if (c === '.') {// Look for a decimal fraction part.
                str += c;
                for (;;) {
                    advance();
                    if (c < '0' || c > '9') {
                        break;
                    }
                    str += c;
                }
            }
            if (c === 'e' || c === 'E') {// Look for an exponent part.
                str += c;
                advance();
                if (c === '-' || c === '+') {
                    str += c;
                    advance();
                }
                if (c < '0' || c > '9') {
                    error("Bad exponent", make('number', str), 1132);
                }
                do {
                    str += c;
                    advance();
                } while (c >= '0' && c <= '9');
            }
            if (c >= 'a' && c <= 'z') {// Make sure the next character is not a letter.
                str += c;
                i += 1;
                error("Bad number",make('number', str), 1142);
            }
			// Convert the string value to a number. If it is finite, then it is a good token.
            n = +str;
            if (isFinite(n)) {
                result.push(make('number', n));
            } else {
                error("Bad number",make('number', str), 1149);
            }
        } else if (c === '\'' || c === '"') {// string
            str = '';
            q = c;
            for (;;) {
                advance();
                if (c < ' ') {
                    error(c === '\n' || c === '\r' || c === '' ?
                        "Unterminated string." :
                        "Control character in string.", make('string', str), 1159);
                }
                if (c === q) {// Look for the closing quote.
                    break;
                }
                if (c === '\\') {// Look for escapement.
                    if ((i+1) >= length) {
						error("Unterminated string",make('number', str),1166);
                    }
                    advance();
                    switch (c) {
						case 'b':
							c = '\b';
							break;
						case 'f':
							c = '\f';
							break;
						case 'n':
							c = '\n';
							break;
						case 'r':
							c = '\r';
							break;
						case 't':
							c = '\t';
							break;
						case 'u':
							if (i >= length) {
								error("Unterminated string",make('number', str), 1187);
							}
							c = parseInt(source.substr(i + 1, 4), 16);
							if (!isFinite(c) || c < 0) {
								error("Unterminated string",make('number', str), 1191);
							}
							c = String.fromCharCode(c);
							i += 4;
							break;
                    }
                }
                str += c;
            }
            result.push(make('string', str));
            advance();
        } else if (c === '/' && source.charAt(i + 1) === '/') {// comment.
            for (;;) {
                advance();
                if (c === '\n' || c === '\r' || c === '') {
                    break;
                }
            }
        } else if (c === '/' && source.charAt(i + 1) === '*') {// /* */ comment.
            for (;;) {
                advance();
                if (c === '*' && source.charAt(i + 1) === '/') {
					c = source.charAt(i += 2);
                    break;
                } else if (i >= length) {
					error("Unterminated Comment",make('number', str), 1216);
				}
            }
        } else if (prefix.indexOf(c) >= 0) {// combining
            str = c;
            while (i < length) {
                advance();
                if (suffix.indexOf(c) < 0) {
                    break;
                } 
                str += c;
            }
            result.push(make('operator', str));
        } else { // single-character operator
            result.push(make('operator', c));
            advance();
        }
    }
    return result;
};

