The `%` operator
================

Returns correct result when used on two `Number`s
-------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = 30 % 5 | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 0 }

Returns correct result when used on two `Duration`s
---------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = :30 seconds: % :5 seconds: | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "00:00:00.000" }

Produces an error when used on invalid operand type combinations
----------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = null % null | view result

### Errors

  * Invalid operand types for "%": null and null.
