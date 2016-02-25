# The `String.toUpperCase` function

## Produces an error when passed an argument of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.toUpperCase(null) | view result

### Warnings

  * Invalid argument type for "String.toUpperCase": expected string, received null.

## Returns the expected uppercase string

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.toUpperCase('hey') | keep result | view result

### Output
    
    { result: "HEY" }
