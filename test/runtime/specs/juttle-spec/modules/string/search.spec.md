# The `String.search` function

## Returns match position when the search is successful

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.search("abcd", /bc/) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 1 }

## Returns `-1` when the search is unsuccessful

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.search("abcd", /fg/) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: -1 }

## Produces an error when passed argument `string` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.search(null, /abcd/) | view result

### Warnings

  * Invalid argument type for "String.search": expected string, received null.

## Produces an error when passed argument `regexp` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.search("abcd", null) | view result

### Warnings

  * Invalid argument type for "String.search": expected regexp, received null.
