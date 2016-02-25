# The `String.toString` function

## Returns correct result when passed a string

### Juttle

    emit -limit 1 | put result = String.toString("abcd") | keep result | view result

### Output

    { result: "abcd" }

## Produces an error when passed an argument of invalid type

### Juttle

    emit -limit 1 | put result = String.toString(null) | view result

### Warnings

  * Invalid argument type for "String.toString": expected string, received null.
