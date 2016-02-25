# The `Duration.seconds` function

## Produces an error when passed an argument of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Duration.seconds(null) | view result

### Warnings

  * Invalid argument type for "Duration.seconds": expected duration, received null.
