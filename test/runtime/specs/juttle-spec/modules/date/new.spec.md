# The `Date.new` function

## Produces an error when passed an argument of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.new(null) | view result

### Warnings

  * Invalid argument type for "Date.new": expected number or string, received null.

## Produces an error when passed a string with an invalid date

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.new('') | view result

### Warnings

  * Unable to parse date: ""
