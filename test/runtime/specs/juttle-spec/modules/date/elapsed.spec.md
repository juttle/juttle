# The `Date.elapsed` function

## Produces an error when passed an argument of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.elapsed(null) | view result

### Warnings

  * Invalid argument type for "Date.elapsed": expected date, received null.
