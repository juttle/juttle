The `Duration.milliseconds` function
====================================

Produces an error when passed an argument of invalid type
---------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Duration.milliseconds(null) | view result

### Warnings

  * Invalid argument type for "Duration.milliseconds": expected duration, received null.
