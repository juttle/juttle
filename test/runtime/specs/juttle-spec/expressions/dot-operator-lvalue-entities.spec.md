# The `.` operator (in lvalue, on entities)

## Assigns correctly when used on a variable

### Juttle

    function f() {
      var v = { a: 1, b: 2, c: 3 };
      v.b = 5;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: { a: 1, b: 5, c: 3 } }

## (Skip) Assigns correctly when used on a point field

### Juttle

    emit -from :0: -limit 1 | put f = { a: 1, b: 2, c: 3 } | put f.b = 5 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", f: { a: 1, b: 5, c: 3 } }

## Produces an error when used on a constant

### Juttle

    function f() {
      const c = { a: 1, b: 2, c: 3 };
      c.b = 5;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Errors

  * CompileError: Variable "c" cannot be modified

## Produces an error when used on a function

### Juttle

    function f() {
      function g() {
      }

      g.b = 5;
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
      r.b = 5;
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
      s.b = 5;
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
      m.b = 5;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Errors

  * CompileError: Variable "m" cannot be modified
