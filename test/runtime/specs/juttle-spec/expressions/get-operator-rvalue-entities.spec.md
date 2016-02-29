# The `[]` operator (in rvalue, on entities)

## Returns correct result when used on a constant

### Juttle

    const c = [ 1, 2, 3 ];

    emit -from :0: -limit 1
    | put result = c[1]
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 2 }

## Returns correct result when used on a variable

### Juttle

    function f() {
      var v = [ 1, 2, 3 ];

      return v[1];
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 2 }

## Returns correct result when used on a point field

### Juttle

    emit -from :0: -limit 1 | put f = [ 1, 2, 3 ] | put result = f[1] | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", f: [ 1, 2, 3 ], result: 2 }

## Produces an error when used on a function

### Juttle

    function f() {
    }

    emit -from :0: -limit 1 | put result = f | view result

### Errors

  * CompileError: Cannot use a function as a variable

## Produces an error when used on a reducer

### Juttle

    reducer r() {
      function update() { }
      function result() { }
    }

    emit -from :0: -limit 1 | put result = r | view result

### Errors

  * CompileError: Cannot use a reducer as a variable

## Produces an error when used on a subgraph

### Juttle

    sub s() {
      pass
    }

    emit -from :0: -limit 1 | put result = s | view result

### Errors

  * CompileError: Cannot use a subgraph as a variable

## Produces an error when used on a module

### Module `m`

    export const c = 5;

### Juttle

    import 'm' as m;

    emit -from :0: -limit 1 | put result = m | view result

### Errors

  * CompileError: Cannot use a module as a variable
