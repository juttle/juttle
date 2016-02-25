# The `Date.unix` function

## Produces an error when passed an argument of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.unix(null) | view result

### Warnings

  * Invalid argument type for "Date.unix": expected date, received null.
