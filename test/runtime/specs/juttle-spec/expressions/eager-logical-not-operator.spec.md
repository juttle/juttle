# The `NOT` operator

## Returns correct result when used on a `Boolean`

### Juttle

    emit -from Date.new(0) -limit 1
      | put f = NOT false
      | put t = NOT true
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", f: true, t: false }

## Produces an error when used on operand of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = NOT null | view result

### Errors

  * Invalid operand type for "NOT": null.

## Produces an error when used on a string literal

Regression test for #650.

### Juttle

    emit -from Date.new(0) -limit 1 | put result = NOT 'abcd' | view result

### Errors

  * Invalid operand type for "NOT": string (abcd).
