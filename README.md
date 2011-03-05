This is part of a bigger project that I am working on but this a standalone version that I use for debugging.

the language currently implemented is kind of like javascript such that you declare 

var foo = "bar";

and if statments

if (true){ //should be noted that the brackets around the condition are optional
	//do something
}

here where things go a bit different

the for loop

for (n) times by -2 as |a| do{
	//do something
}

The for each loop

var x = [1,2,3];
for each n in x do{
	//do something
}

the while loop is the same (the "is true" is basically just == true)

while (x is true){
	//do something;
}

hashes and arrays I think are all the same 