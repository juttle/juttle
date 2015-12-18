The `Math.asin` function
========================

Produces an error when passed an argument of incorrect type
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.asin(null) | view result

### Warnings

  * Invalid argument type for "Math.asin": expected number, received null.
