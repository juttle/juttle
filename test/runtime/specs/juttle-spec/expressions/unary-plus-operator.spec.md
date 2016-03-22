# The unary `+` operator

## Returns correct result when used on a `Number`

### Juttle

    emit -from Date.new(0) -limit 1 | put result = +5 | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 5 }

## Returns correct result when used on a `Duration`

### Juttle

    emit -from Date.new(0) -limit 1 | put result = +:5 seconds: | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "00:00:05.000" }

## Produces an error when used on operand of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = +null | view result

### Errors

  * Invalid operand type for "+": null.

## Produces an error when used on a string literal

Regression test for #650.

### Juttle

    emit -from Date.new(0) -limit 1 | put result = +'abcd' | view result

### Errors

  * Invalid operand type for "+": string (abcd).
