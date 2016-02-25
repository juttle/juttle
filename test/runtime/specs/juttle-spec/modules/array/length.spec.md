# The `Array.length` function

## Returns correct result

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.length(['a','b']) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 2 }

## Produces an error when passed an argument of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.length(null) | view result

### Warnings

  * Invalid argument type for "Array.length": expected array, received null.
