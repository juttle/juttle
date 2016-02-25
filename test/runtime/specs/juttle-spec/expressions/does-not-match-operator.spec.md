# The `!~` operator

## Returns correct result when used on two `String`s

### Juttle

    emit -from Date.new(0) -limit 1
      | put ma = 'abcd' !~ 'abcd'
      | put nm = 'abcd' !~ 'efgh'
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", ma: false, nm: true }

## Returns correct result when used on a non-`String` and a `String`

### Juttle

    emit -from Date.new(0) -limit 1
      | put nm = null !~ 'abcd'
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", nm: true }

## Returns correct result when used on a `String` and a `RegExp`

### Juttle

    emit -from Date.new(0) -limit 1
      | put ma = 'abcd' !~ /abcd/
      | put nm = 'abcd' !~ /efgh/
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", ma: false, nm: true }

## Returns correct result when used on a non-`String` and a `RegExp`

### Juttle

    emit -from Date.new(0) -limit 1
      | put nm = null !~ /abcd/
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", nm: true }

## Produces an error when used on invalid operand type combinations

### Juttle

    emit -from Date.new(0) -limit 1
      | put result = null !~ null
      | view result

### Errors

  * Invalid operand types for "!~": null and null.
