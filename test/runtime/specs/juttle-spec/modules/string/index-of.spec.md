# The `String.indexOf` function

## Returns correct result

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.indexOf('A Blue Whale', 'Blue') | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 2 }

## Returns correct result when string not found

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.indexOf('Blue Whale', 'Blute') | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: -1 }


## Is case-sensitive

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.indexOf('Blue Whale', 'blue') | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: -1 }

## Produces an error when passed argument `string` of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.indexOf(null, "efgh") | view result

### Warnings

  * Invalid argument type for "String.indexOf": expected string, received null.

## Produces an error when passed argument `searchString` of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.indexOf("abcd", null) | view result

### Warnings

  * Invalid argument type for "String.indexOf": expected string, received null.
