This is part of a bigger project that I am working on but this a standalone version that I use for debugging.
It was originally based of of <a href="http://javascript.crockford.com/tdop/index.html">Douglas Crockford</a> but it has been heavily modified
the language currently implemented is kind of like javascript such that you declare 
<code>
var foo = "bar";
</code>

If statments
<code>
	if (true){ //should be noted that the brackets around the condition are optional
		//do something
	}
</code>
here where things go a bit different. I should note that all brackets around usual parameters are optional except function parameters. 
the "by" statement in my loops is basically a step definition but it also works a bit different in the from loop a negative by value will go from the highest value to the lowest.
and a positive value with go from lowest to highest. In the for loop it should act as thought but that is in progress.
the "as" value is just what the current loop evaluation is.

The for loop
<code>
	for (n) times by -2 as |a| do{
		//do something
	}
</code>

The for each loop
<code>
	var x = [1,2,3];
	for each n in x do{
		//do something
	}
</code>

from loop
<code>
	from 1 to 5 by -2 as |x| do{
		//do something
	}
</code>

The while loop is the same (the "is true" is basically just == true)
<code>
	while (x is true){
		//do something;
	}
</code>
hashes and arrays I think are all the same 