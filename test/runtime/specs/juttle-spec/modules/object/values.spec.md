# The `Object.values` function

## Returns correct result with no values

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Object.values({}) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: [] }

## Returns correct result with one key

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Object.values({'a': 1}) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: [1] }

## Returns correct result with multiple values

### Juttle

    emit -from Date.new(0) -limit 1
    | put result = Object.values({'a': 1, 'b': 2})
    | split result
    | sort value
    | keep value
    | view result

### Output

    { value: 1 }
    { value: 2 }

## Produces an error when passed argument `object` of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Object.values(null) | view result

### Warnings

  * Invalid argument type for "Object.values": expected object, received null.
