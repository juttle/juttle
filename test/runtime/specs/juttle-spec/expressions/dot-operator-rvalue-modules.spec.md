# The `.` operator (in rvalue, on modules)

## Returns correct result when used on a module, accessing a constant

### Module `m`

    export const c = 5;

### Juttle

    import 'm' as m;

    emit -from :0: -limit 1 | put result = m.c | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 5 }

## Produces an error when used on a module, accessing a function

### Module `m`

    export function f() {
    }

### Juttle

    import 'm' as m;

    emit -from :0: -limit 1 | put result = m.f | view result

### Errors

  * CompileError: Cannot use a function as a variable

## Produces an error when used on a module, accessing a reducer

### Module `m`

    export reducer r() {
      function update() { }
      function result() { }
    }

### Juttle

    import 'm' as m;

    emit -from :0: -limit 1 | put result = m.r | view result

### Errors

  * CompileError: Cannot use a reducer as a variable

## Produces an error when used on a module, accessing a subgraph

### Module `m`

    export sub s() {
      pass
    }

### Juttle

    import 'm' as m;

    emit -from :0: -limit 1 | put result = m.s | view result

### Errors

  * CompileError: Cannot use a subgraph as a variable
