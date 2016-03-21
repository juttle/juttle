# The `[]` operator (in lvalue, on entities)

## Assigns correctly when used on a variable

### Juttle

    function f() {
      var v = [ 1, 2, 3 ];
      v[1] = 5;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [ 1, 5, 3 ] }

## Assigns correctly when used on a point field

### Juttle

    emit -from :0: -limit 1 | put f = [ 1, 2, 3 ] | put f[1] = 5 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", f: [ 1, 5, 3 ] }

## Produces an error when used on a constant

### Juttle

    function f() {
      const c = [ 1, 2, 3 ];
      c[1] = 5;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Errors

  * CompileError: Variable "c" cannot be modified

## Produces an error when used on a function

### Juttle

    function f() {
      function g() {
      }

      g[1] = 5;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Errors

  * CompileError: Variable "g" cannot be modified

## Produces an error when used on a reducer

### Juttle

    reducer r() {
      function update() { }
      function result() { }
    }

    function f() {
      r[1] = 5;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Errors

  * CompileError: Variable "r" cannot be modified

## Produces an error when used on a subgraph

### Juttle

    sub s() {
      pass
    }

    function f() {
      s[1] = 5;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Errors

  * CompileError: Variable "s" cannot be modified

## Produces an error when used on a module

### Module `m`

    export const c = 5;

### Juttle

    import 'm' as m;

    function f() {
      m[1] = 5;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Errors

  * CompileError: Variable "m" cannot be modified
