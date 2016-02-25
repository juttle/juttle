# The `String.length` function

## Produces an error when passed an argument of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.length(null) | view result

### Warnings

  * Invalid argument type for "String.length": expected string, received null.

## Returns the string length

### Juttle

    emit -limit 1 | put length = String.length('FizzBuzz') | keep length | view result

### Output

    { length: 8 } 
