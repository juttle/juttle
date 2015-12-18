The `~` operator
================

Returns correct result when used on a `Number`
----------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = ~5 | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: -6 }

Produces an error when used on operand of invalid type
------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = ~null | view result

### Errors

  * Invalid operand type for "~": null.
