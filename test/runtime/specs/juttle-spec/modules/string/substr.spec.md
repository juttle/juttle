# The `String.substr` function

## Produces an error when passed argument `string` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.substr(null, 5, 6) | view result

### Warnings

  * Invalid argument type for "String.substr": expected string, received null.


## Produces an error when passed argument `start` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.substr("abcd", null, 6) | view result

### Warnings

  * Invalid argument type for "String.substr": expected number, received null.


## Produces an error when passed argument `length` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.substr("abcd", 5, null) | view result

### Warnings

  * Invalid argument type for "String.substr": expected number, received null.
