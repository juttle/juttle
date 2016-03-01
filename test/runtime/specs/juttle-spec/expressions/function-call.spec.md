# A function call

## Works correctly inside a recursive function

### Juttle

    function factorial(n) {
      return n == 0 ? 1 : n * factorial(n - 1);
    }

    emit -from Date.new(0) -limit 1 | put result = factorial(5) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 120 }

## Returns correct result when passed required parameters (with optional parameters)

### Juttle

    function f(a, b = 5) {
      return [a, b];
    }

    emit -from Date.new(0) -limit 1 | put result = f(1) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [1, 5] }

## Returns correct result when passed required and optional parameters (with optional parameters)

### Juttle

    function f(a, b = 5) {
      return [a, b];
    }

    emit -from Date.new(0) -limit 1 | put result = f(1, 2) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [1, 2] }

## Produces an error when passed too few parameters (with optional parameters)

### Juttle

    function f(a, b = 5) {
      return [a, b];
    }

    emit -from Date.new(0) -limit 1 | put result = f() | view result

### Errors

  * Error: function f expects 1 to 2 arguments but was called with 0

## Produces an error when passed too many parameters (with optional parameters)

### Juttle

    function f(a, b = 5) {
      return [a, b];
    }

    emit -from Date.new(0) -limit 1 | put result = f(1, 2, 3) | view result

### Errors

  * Error: function f expects 1 to 2 arguments but was called with 3

## Returns correct result when passed required parameters (module, with optional parameters)

### Module `m`

    export function f(a, b = 5) {
      return [a, b];
    }

### Juttle

    import 'm' as m;

    emit -from Date.new(0) -limit 1 | put result = m.f(1) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [1, 5] }

## Returns correct result when passed required and optional parameters (module, with optional parameters)

### Module `m`

    export function f(a, b = 5) {
      return [a, b];
    }

### Juttle

    import 'm' as m;

    emit -from Date.new(0) -limit 1 | put result = m.f(1, 2) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [1, 2] }

## Produces an error when passed too few parameters (module, with optional parameters)

### Module `m`

    export function f(a, b = 5) {
      return [a, b];
    }

### Juttle

    import 'm' as m;

    emit -from Date.new(0) -limit 1 | put result = m.f() | view result

### Errors

  * Error: function m.f expects 1 to 2 arguments but was called with 0

## Produces an error when passed too many parameters (module, with optional parameters)

### Module `m`

    export function f(a, b = 5) {
      return [a, b];
    }

### Juttle

    import 'm' as m;

    emit -from Date.new(0) -limit 1 | put result = m.f(1, 2, 3) | view result

### Errors

  * Error: function m.f expects 1 to 2 arguments but was called with 3

## Returns correct result when passed required parameters (without optional parameters)

### Juttle

    function f(a) {
      return a;
    }

    emit -from Date.new(0) -limit 1 | put result = f(1) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 1 }


## Produces an error when passed too few parameters (without optional parameters)

### Juttle

    function f(a) {
      return a;
    }

    emit -from Date.new(0) -limit 1 | put result = f() | view result

### Errors

  * Error: function f expects 1 argument but was called with 0

## Produces an error when passed too many parameters (without optional parameters)

### Juttle

    function f(a) {
      return a;
    }

    emit -from Date.new(0) -limit 1 | put result = f(1, 2, 3) | view result

### Errors

  * Error: function f expects 1 argument but was called with 3

## Returns correct result when passed required parameters (module, without optional parameters)

### Module `m`

    export function f(a) {
      return a;
    }

### Juttle

    import 'm' as m;

    emit -from Date.new(0) -limit 1 | put result = m.f(1) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 1 }

## Produces an error when passed too few parameters (module, without optional parameters)

### Module `m`

    export function f(a) {
      return a;
    }

### Juttle

    import 'm' as m;

    emit -from Date.new(0) -limit 1 | put result = m.f() | view result

### Errors

  * Error: function m.f expects 1 argument but was called with 0

## Produces an error when passed too many parameters (module, without optional parameters)

### Module `m`

    export function f(a) {
      return a;
    }

### Juttle

    import 'm' as m;

    emit -from Date.new(0) -limit 1 | put result = m.f(1, 2, 3) | view result

### Errors

  * Error: function m.f expects 1 argument but was called with 3

## Is not executed in compile-time when inside an expression in `put`

This is a regression test for #454. It relies on the fact that the `error`
statement produces an error, but this error turns into a warning when produced
in runtime.

### Juttle

    function f() {
        error 'Boom!';
    }

    emit -from :0: -limit 10 | put a = f()

### Output

    

### Warnings

  * Boom!

## Is not executed in compile-time when inside an expression in `reduce`

This is a regression test for #454. It relies on the fact that the `error`
statement produces an error, but this error turns into a warning when produced
in runtime.

### Juttle

    function f() {
        error 'Boom!';
    }

    emit -from :0: -limit 10 | reduce a = f()

### Output

    

### Warnings

  * Boom!

## Is not executed in compile-time when inside an expression in `filter`

This is a regression test for #454. It relies on the fact that the `error`
statement produces an error, but this error turns into a warning when produced
in runtime.

### Juttle

    function f() {
        error 'Boom!';
    }

    emit -from :0: -limit 10 | filter f() < 5

### Output

    

### Warnings

  * Boom!
