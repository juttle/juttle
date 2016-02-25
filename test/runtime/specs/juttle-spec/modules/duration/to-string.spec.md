# The `Duration.toString` function

## Returns correct result when passed a duration

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Duration.toString(:00:00:05:) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "00:00:05.000" }

## Produces an error when passed an argument of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Duration.toString(null) | view result

### Warnings

  * Invalid argument type for "Duration.toString": expected duration, received null.
