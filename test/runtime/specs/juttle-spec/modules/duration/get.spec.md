The `Duration.get` function
===========================

Produces an error when passed argument `duration` of invalid type
-----------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Duration.get(null, "abcd") | view result

### Warnings

  * Invalid argument type for "Duration.get": expected duration, received null.

Produces an error when passed argument `unit` of invalid type
-------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Duration.get(:00:00:05:, null) | view result

### Warnings

  * Invalid argument type for "Duration.get": expected string, received null.
