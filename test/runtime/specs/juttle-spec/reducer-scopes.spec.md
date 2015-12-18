Tests for reducers in subgraphs
===============================



Reducer using reducer arg
------------------------------

### Juttle

    reducer r(y) { function result() { return y + 1;} function update() { ; }}
    emit -limit 1 | reduce a = r(1) | keep a | view result

### Output

    {a: 2}


Reducer using reducer const
---------------------------

### Juttle

    reducer r() { const y = 1; function result() { return y + 1;} function update() { ; }}
    emit -limit 1 | reduce a = r() | keep a | view result

### Output

    {a: 2}


Reducer using top-level const
-----------------------------

### Juttle

    const x = 1;
    reducer r() { function result() { return x + 1;} function update() { ; }}
    emit -limit 1 | reduce a = r() | keep a | view result

### Output

    {a: 2}


Reducer using sub arg
---------------------

### Juttle

    sub s(y) {
      reducer r() { function result() { return y;} function update() { ; }}
      reduce a=r()
    }
    emit -limit 1 | s -y 4 | keep a | view result

### Output

    {a: 4}


Reducer using sub arg (multiply-instantiated sub)
-------------------------------------------------

### Juttle

    sub s(y) {
      reducer r() { function result() { return y;} function update() { ; }}
      reduce a=r()
    }
    emit -limit 1 | (s -y 3; s -y 4) | keep a | view result

### Output

    {a: 3}
    {a: 4}


Reducer using reducer arg (multiply-instantiated sub)
-----------------------------------------------------

### Juttle

    sub s(y) {
      reducer r(y) { function result() { return y;} function update() { ; }}
      reduce a=r(y)
    }
    emit -limit 1 | (s -y 3; s -y 4) | keep a | view result

### Output

    {a: 3}
    {a: 4}

Reducer using const from sub arg (multiply-instantiated sub)
------------------------------------------------------------

### Juttle

    sub s(y) {
      const x = y;
      reducer r() { function result() { return x;} function update() { ; }}
      reduce a=r()
    }
    emit -limit 1 | (s -y 3; s -y 4) | keep a | view result

### Output

    {a: 3}
    {a: 4}


Reducer using stream value (multiply-instantiated sub)
------------------------------------------------------

### Juttle

    sub s(y) {
      reducer r(fname) {
        var c = 0;
        function result() { return c;}
        function update() { c = c + *fname; }
      }
      reduce r(y)
    }
    emit -limit 1 | put a = 1, b = 2 | (s -y 'a'; s -y 'b') | keep r | view result

### Output

    {r: 1}
    {r: 2}
