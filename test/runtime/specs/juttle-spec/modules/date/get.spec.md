The `Date.get` function
=======================

Produces an error when passed argument `date` of invalid type
-------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.get(null, "abcd") | view result

### Warnings

  * Invalid argument type for "Date.get": expected date, received null.

Produces an error when passed argument `unit` of invalid type
-------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.get(:2015-01-01T00:00:00:, null) | view result

### Warnings

  * Invalid argument type for "Date.get": expected string, received null.
