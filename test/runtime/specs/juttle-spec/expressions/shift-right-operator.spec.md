The `>>` operator
=================

Returns correct result when used on two `Number`s
-------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = 5 >> 1 | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 2 }

Produces an error when used on invalid operand type combinations
----------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = null >> null | view result

### Errors

  * Invalid operand types for ">>": null and null.
