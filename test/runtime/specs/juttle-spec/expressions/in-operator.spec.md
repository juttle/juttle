# The `in` operator

## Returns correct result when used on any value and an `Array`

### Juttle

    emit -from Date.new(0) -limit 1
      | put in = 2 in [1, 2, 3]
      | put ni = 4 in [1, 2, 3]
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", in: true, ni: false }

## Produces an error when used on invalid operand type combinations

### Juttle

    emit -from Date.new(0) -limit 1
      | put result = null in null
      | view result

### Errors

  * Invalid operand types for "in": null and null.
