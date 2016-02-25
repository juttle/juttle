# The `Object.keys` function

## Returns correct result with no keys

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Object.keys({}) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: [] }

## Returns correct result with one key

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Object.keys({'a': 1}) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: ["a"] }

## Returns correct result with multiple keys

### Juttle

    emit -from Date.new(0) -limit 1
    | put result = Object.keys({'a': 1, 'b': 2})
    | split result
    | sort value
    | keep value
    | view result

### Output

    { value: "a" }
    { value: "b" }

## Produces an error when passed argument `object` of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Object.keys(null) | view result

### Warnings

  * Invalid argument type for "Object.keys": expected object, received null.
