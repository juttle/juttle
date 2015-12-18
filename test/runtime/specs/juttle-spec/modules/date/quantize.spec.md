The `Date.quantize` function
============================

Produces an error when passed argument `date` of invalid type
-------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.quantize(null, :00:00:05:) | view result

### Warnings

  * Invalid argument type for "Date.quantize": expected date, received null.

Produces an error when passed argument `duration` of invalid type
-----------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.quantize(:2015-01-01T00:00:00:, null) | view result

### Warnings

  * Invalid argument type for "Date.quantize": expected duration, received null.
