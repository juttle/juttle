The `Math.sqrt` function
========================

Produces an error when passed an argument of incorrect type
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.sqrt(null) | view result

### Warnings

  * Invalid argument type for "Math.sqrt": expected number, received null.
