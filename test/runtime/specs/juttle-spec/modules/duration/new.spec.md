# The `Duration.new` function

## Produces an error when passed an argument of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Duration.new(null) | view result

### Warnings

  * Invalid argument type for "Duration.new": expected number or string, received null.
