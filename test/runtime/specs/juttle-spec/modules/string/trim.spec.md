# The `String.trim` function

## Produces an error when passed an argument of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.trim(null) | view result

### Warnings

  * Invalid argument type for "String.trim": expected string, received null.

## Returns the string trim

### Juttle

    emit -limit 1 | put trim = String.trim(' hello \t') | keep trim | view result

### Output

    { trim: "hello" }
