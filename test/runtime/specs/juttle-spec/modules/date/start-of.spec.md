# The `Date.startOf` function

## Produces an error when passed argument `date` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.startOf(null, "abcd") | view result

### Warnings

  * Invalid argument type for "Date.startOf": expected date, received null.


## Produces an error when passed argument `unit` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.startOf(:2015-01-01T00:00:00:, null) | view result

### Warnings

  * Invalid argument type for "Date.startOf": expected string, received null.
