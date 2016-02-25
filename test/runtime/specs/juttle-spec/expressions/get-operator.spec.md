# The `[]` operator

Partial specification. Will be finished as part of PROD-5468.

## Returns correct result when used on an array (existing element)

### Juttle

    emit -from Date.new(0) -limit 1 | put result = [1, 2, 3][0] | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 1 }

## Returns correct result when used on an array (missing element)

### Juttle

    emit -from Date.new(0) -limit 1 | put result = [1, 2, 3][3] | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: null }

## Returns correct result when used on an object (existing entry)

### Juttle

    emit -from Date.new(0) -limit 1 | put result = { a: 1, b: 2, c: 3}["a"] | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 1 }

## Returns correct result when used on an object (missing entry)

### Juttle

    emit -from Date.new(0) -limit 1 | put result = { a: 1, b: 2, c: 3}["d"] | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: null }
