# The `Date.endOf` function

## Produces an error when passed argument `date` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.endOf(null, "abcd") | view result

### Warnings

  * Invalid argument type for "Date.endOf": expected date, received null.

## Produces an error when passed argument `unit` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.endOf(:2015-01-01T00:00:00:, null) | view result

### Warnings

  * Invalid argument type for "Date.endOf": expected string, received null.
