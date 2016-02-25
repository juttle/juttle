# The `Math.ceil` function

## Produces an error when passed an argument of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.ceil(null) | view result

### Warnings

  * Invalid argument type for "Math.ceil": expected number, received null.
