# The `Math.pow` function

## Produces an error when passed argument `x` of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.pow(null, 5) | view result

### Warnings

  * Invalid argument type for "Math.pow": expected number, received null.


## Produces an error when passed argument `y` of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.pow(5, null) | view result

### Warnings

  * Invalid argument type for "Math.pow": expected number, received null.
