# The ternary operator

## Returns correct result when used on a `Boolean`

### Juttle

    emit -from Date.new(0) -limit 1
      | put f = false ? 1 : 0
      | put t = true ? 1 : 0
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", f: 0, t: 1 }

## Produces an error when used on operand of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = null ? 1 : 0 | view result

### Errors

  * Ternary operator: Invalid operand type (null).
