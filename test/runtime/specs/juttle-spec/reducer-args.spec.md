# Reducer arguments

## Variables in reducer arguments are coerced to fields

### Juttle

    emit -from :0: -limit 1 | reduce min(time) | view result

### Output

    { min: "1970-01-01T00:00:00.000Z" }

## Variables in reducer arguments are not coerced if they refer to entities in scope

Regression test for #646.

### Juttle

    function f() {
    }

    emit -from :0: -limit 1 | reduce min(f) | view result

### Errors

  * CompileError: Cannot use a function as a variable
