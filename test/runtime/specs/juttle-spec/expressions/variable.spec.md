# Variable

## Returns a point field value when used in streaming context and the field exists

### Juttle

    emit -from Date.new(0) -limit 1 | put a = 5 | put b = a | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", a: 5, b: 5 }

## Returns `null` when used in streaming context and the field does not exist

### Juttle

    emit -from Date.new(0) -limit 1 | put b = a | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", b: null }

## (skip PROD-7136) Throws an error when an imported module name is used in a const declaration

### Juttle

    import 'mod' as m; const d = m; emit -limit 1

### Errors

   * Cannot use a module as a variable

## (skip PROD-7136) Throws an error when an imported module name is used in a by list

### Juttle

    import 'mod' as m; emit -limit 1 | keep m

### Errors

   * Cannot use a module as a variable

## (skip PROD-7136) Throws an error when an imported module name is used in a stream expression

### Juttle

    import 'mod' as m; emit -limit 1 | put a = m

### Errors

   * Cannot use a module as a variable

## Throws an error when a built-in module name is used in a const declaration

### Juttle

    const d = Date; emit -limit 1

### Errors

   * Cannot use a module as a variable

## Throws an error when a built-in module name is used in a const declaration (inside a member expression object)

Regression test for the issue fixed by #552.

### Juttle

    const d = (Date + 1)[0]; emit -limit 1

### Errors

   * Cannot use a module as a variable

## Throws an error when a built-in module name is used in a by list

### Juttle

    emit -limit 1 | reduce by Date

### Errors

   * Cannot use a module as a variable

## Throws an error when a built-in module name is used in a stream expression

### Juttle

    emit -limit 1 | put a = Date

### Errors

   * Cannot use a module as a variable

## Throws an error when a function name is used in a const declaration

### Juttle

    function f() {return 1;}; const d = f; emit -limit 1

### Errors

   * Cannot use a function as a variable


## Throws an error when a function name is used in a const declaration (inside a member expression object)

Regression test for the issue fixed by #552.

### Juttle

    function f() {return 1;}; const d = (f + 1)[0]; emit -limit 1

### Errors

   * Cannot use a function as a variable


## Throws an error when a function name is used in a by list

### Juttle

    function f() {return 1;}; emit -limit 1 | reduce by f

### Errors

   * Cannot use a function as a variable


## Throws an error when a function name is used in a stream expression

### Juttle

    function f() {return 1;}; emit -limit 1 | put a = f

### Errors

   * Cannot use a function as a variable


## Throws an error when a reducer name is used in a const declaration

### Juttle

    reducer r() {
      function update() { }
      function result() { }
    }

    const d = r; emit -limit 1

### Errors

   * Cannot use a reducer as a variable


## Throws an error when a reducer name is used in a const declaration (inside a member expression object)

Regression test for the issue fixed by #552.

### Juttle

    reducer r() {
      function update() { }
      function result() { }
    }

    const d = (r + 1)[0]; emit -limit 1

### Errors

   * Cannot use a reducer as a variable


## Throws an error when a reducer name is used in a by list

### Juttle

    reducer r() {
      function update() { }
      function result() { }
    }

    emit -limit 1 | reduce by r

### Errors

   * Cannot use a reducer as a variable


## Throws an error when a reducer name is used in a stream expression

### Juttle

    reducer r() {
      function update() { }
      function result() { }
    }

    emit -limit 1 | put a = r

### Errors

   * Cannot use a reducer as a variable
