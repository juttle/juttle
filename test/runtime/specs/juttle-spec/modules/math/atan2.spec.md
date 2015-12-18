The `Math.atan2` function
=========================

Produces an error when passed argument `y` of incorrect type
------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.atan2(null, 5) | view result

### Warnings

  * Invalid argument type for "Math.atan2": expected number, received null.

Produces an error when passed argument `x` of incorrect type
------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.atan2(5, null) | view result

### Warnings

  * Invalid argument type for "Math.atan2": expected number, received null.
