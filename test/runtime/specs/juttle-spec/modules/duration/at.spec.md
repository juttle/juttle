# The `Duration.as` function

## Produces an error when passed argument `duration` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Duration.as(null, "abcd") | view result

### Warnings

  * Invalid argument type for "Duration.as": expected duration, received null.

## Produces an error when passed argument `unit` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Duration.as(:00:00:05:, null) | view result

### Warnings

  * Invalid argument type for "Duration.as": expected string, received null.
