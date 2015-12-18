Tests for complex parameters to subgraphs
=========================================

subgraph with params passed by -
--------------------------------

### Juttle

    sub fakemit(st, hertz, lim) {
      emit -from st -hz hertz -limit lim
    }
    fakemit -st Date.new(0) -hertz 1000 -lim 2 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }
    { time: "1970-01-01T00:00:00.001Z" }

subgraph with missing parameters
--------------------------------

### Juttle

    sub fakemit(st, hertz, lim) {
      emit -from st -hz hertz -limit lim
    }
    fakemit -st Date.new(0) -lim 2 | view result

### Errors

   * Subgraph fakemit called without argument hertz

subgraph with optional parameter (passed)
-----------------------------------------

### Juttle

    sub fakemit(st, hertz, lim = 5) {
      emit -from st -hz hertz -limit lim
    }
    fakemit -st Date.new(0) -hertz 1000 -lim 2 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }
    { time: "1970-01-01T00:00:00.001Z" }

subgraph with optional parameter (not passed)
---------------------------------------------

### Juttle

    sub fakemit(st, hertz, lim = 5) {
      emit -from st -hz hertz -limit lim
    }
    fakemit -st Date.new(0) -hertz 1000 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }
    { time: "1970-01-01T00:00:00.001Z" }
    { time: "1970-01-01T00:00:00.002Z" }
    { time: "1970-01-01T00:00:00.003Z" }
    { time: "1970-01-01T00:00:00.004Z" }

subgraph with -o (unsupported)
------------------------------

### Juttle
    const p = {st: 1};

    sub fakemit(st, hertz, lim) {
      emit -from st -hz hertz -limit lim
    }
    fakemit -o p -lim 2 | view result

### Errors

   * Subgraph fakemit called with invalid argument o

subgraph with invalid parameters
--------------------------------

### Juttle

    sub fakemit(st, hertz, lim) {
      emit -from st -hz hertz -limit lim
    }
    fakemit -st Date.new(0) -lim 2 -hz 100 | view result

### Errors

   * Subgraph fakemit called with invalid argument hz

subgraph with params passed by - (module)
-----------------------------------------

### Module `mitt`

    export sub fakemit(st, hertz, lim) {
      emit -from st -hz hertz -limit lim
    }

### Juttle

    import "mitt" as m;
    m.fakemit -st Date.new(0) -hertz 1000 -lim 2 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }
    { time: "1970-01-01T00:00:00.001Z" }

subgraph with optional params (passed, module)
----------------------------------------------

### Module `mitt`

    export sub fakemit(st, hertz, lim = 5) {
      emit -from st -hz hertz -limit lim
    }

### Juttle

    import "mitt" as m;
    m.fakemit -st Date.new(0) -hertz 1000 -lim 2 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }
    { time: "1970-01-01T00:00:00.001Z" }

subgraph with optional params (not passed, module)
--------------------------------------------------

### Module `mitt`

    export sub fakemit(st, hertz, lim = 5) {
      emit -from st -hz hertz -limit lim
    }

### Juttle

    import "mitt" as m;
    m.fakemit -st Date.new(0) -hertz 1000 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }
    { time: "1970-01-01T00:00:00.001Z" }
    { time: "1970-01-01T00:00:00.002Z" }
    { time: "1970-01-01T00:00:00.003Z" }
    { time: "1970-01-01T00:00:00.004Z" }

subgraph with missing params (module)
-------------------------------------

### Module `mitt`

    export sub fakemit(st, hertz, lim) {
      emit -from st -hz hertz -limit lim
    }

### Juttle

    import "mitt" as m;
    m.fakemit -st Date.new(0) -lim 2 | view result

### Errors

   * Subgraph m.fakemit called without argument hertz
