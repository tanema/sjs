This is part of a bigger project that I am working on but this a standalone version that I use for debugging.
It was originally based of of <a href="http://javascript.crockford.com/tdop/index.html">Douglas Crockford</a> but it has been heavily modified
the language currently implemented is kind of like javascript such that you declare 
<code>
var foo = "bar";
</code>
and if statments
<code>
if (true){ //should be noted that the brackets around the condition are optional
	//do something
}
</code>
here where things go a bit different

the for loop
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
the while loop is the same (the "is true" is basically just == true)
<code>
while (x is true){
	//do something;
}
</code>
hashes and arrays I think are all the same 