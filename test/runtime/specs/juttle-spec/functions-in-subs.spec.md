Tests for functions in subgraph
===============================



Function used in stream context inside a sub
--------------------------------------------

### Juttle

    sub s() {
      function f(foo) {
        return foo * 2;
      }
      put a=b + f(0.6)
    }
    emit -limit 1 -hz 1000 | put b = 1 | s | keep a | view result

### Output

    {a : 2.2}



Function using sub argument (stream context, multiply-instantiated sub)
-----------------------------------------------------------------------

### Juttle

    sub s(y) {
      function f() { return y; }
        put a=f()
    }
    emit -limit 1 | (s -y 3; s -y 4) | keep a | view result

### Output

    {a: 3}
    {a: 4}


Function-in-function using sub argument (stream context, multiply-instantiated sub)
-----------------------------------------------------------------------------------

### Juttle

    sub s(y) {
      function f() { function g() { return y;} return g(); }
        put a=f()
    }
    emit -limit 1 | (s -y 3; s -y 4) | keep a | view result

### Output

    {a: 3}
    {a: 4}


Function using const from sub argument (stream context, multiply-instantiated sub)
----------------------------------------------------------------------------------

### Juttle

    sub s(y) {
      const x = y;
      function f() { return x; }
      put a=f(), b=x
    }
    emit -limit 1  -hz 1000 | (s -y 3; s -y 4) | keep a, b | view result

### Output

    {a: 3, b: 3}
    {a: 4, b: 4}



Put expression using sub argument (multiply-instantiated sub)
-------------------------------------------------------------

### Juttle

    sub s(y) {
      put a= y + b
    }
    emit -limit 1 | put b = 1 | (s -y 2; s -y 3) | keep a | view result

### Output

    {a: 3}
    {a: 4}

Function using sub argument and stream value (multiply-instantiated sub)
------------------------------------------------------------------------

### Juttle

    sub s(y) {
      function f(x) { return x + y; }
      put a=f(b)
    }
    emit -limit 1 | put b = 1 | (s -y 2; s -y 3) | keep a | view result

### Output

    {a: 3}
    {a: 4}

Function using const shadowing sub argument (multiply-instantiated sub)
-----------------------------------------------------------------------

### Juttle

    sub s(x) {
      function f(foo) {
        const x = 0.5;
        return foo + x;
      }
      put a=f(x)
    }
    emit -limit 1 | (s -x 1; s -x 2) | keep a | view result

### Output

    {a: 1.5}
    {a: 2.5}


Math function using sub argument and stream value (stream context, multiply-instantiated sub)
---------------------------------------------------------------------------------------------

### Juttle

    sub s(y) {
      put a=Math.floor(b + y)
    }
    emit -limit 1 | (put b = 1.5 | s -y 3;
                        put b = 2.5 | s -y 4) | keep a | view result

### Output

    {a: 4}
    {a: 6}


Duration function using sub argument and stream value (stream context, multiply-instantiated sub)
-------------------------------------------------------------------------------------------------

### Juttle

    sub s(y) {
      put a=Duration.seconds(Duration.new(b + y))
    }
    emit -limit 1 | (put b = 1 | s -y 3;
                        put b = 2 | s -y 4) | keep a | view result

### Output

    {a: 4}
    {a: 6}

Date function using sub argument and stream value (stream context, multiply-instantiated sub)
---------------------------------------------------------------------------------------------

### Juttle

    sub s(y) {
      put a=Date.unixms(Date.new(b + y))
    }
    emit -limit 1 | (put b = 1 | s -y 3;
                        put b = 2 | s -y 4) | keep a | view result

### Output

    {a: 4000}
    {a: 6000}



String function using sub argument and stream value (stream context, multiply-instantiated sub)
-----------------------------------------------------------------------------------------------

### Juttle

    sub s(y) {
      put a=String.length(b + y)
    }
    emit -limit 1 | (put b = "a" | s -y "aa";
                        put b = "aa" | s -y "aaaa") | keep a | view result

### Output

    {a: 3}
    {a: 6}
