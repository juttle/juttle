# The `.` operator (in rvalue, on entities)

## Returns correct result when used on a constant

### Juttle

    const c = { a: 1, b: 2, c: 3 };

    emit -from :0: -limit 1 | put result = c.b | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 2 }

## Returns correct result when used on a variable

### Juttle

    function f() {
      var v = { a: 1, b: 2, c: 3 };

      return v.b;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 2 }

## Returns correct result when used on a point field

### Juttle

    emit -from :0: -limit 1 | put f = { a: 1, b: 2, c: 3 } | put result = f.b | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", f: { a: 1, b: 2, c: 3 }, result: 2 }

## Returns a correct result when used on a module

### Module `m`

    export const c = 5;

### Juttle

    import 'm' as m;

    emit -from :0: -limit 1 | put result = m.c | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 5 }

## Produces an error when used on a function

### Juttle

    function f() {
    }

    emit -from :0: -limit 1 | put result = f.b | view result

### Errors

  * CompileError: Cannot use a function as a variable

## Produces an error when used on a reducer

### Juttle

    reducer r() {
      function update() { }
      function result() { }
    }

    emit -from :0: -limit 1 | put result = r.b | view result

### Errors

  * CompileError: Cannot use a reducer as a variable

## Produces an error when used on a subgraph

### Juttle

    sub s() {
      pass
    }

    emit -from :0: -limit 1 | put result = s.b | view result

### Errors

  * CompileError: Cannot use a subgraph as a variable
