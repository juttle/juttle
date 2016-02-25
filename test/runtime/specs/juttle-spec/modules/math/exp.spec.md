# The `Math.exp` function

## Produces an error when passed an argument of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.exp(null) | view result

### Warnings

  * Invalid argument type for "Math.exp": expected number, received null.
