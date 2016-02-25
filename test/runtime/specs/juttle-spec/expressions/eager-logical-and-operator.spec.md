# The `AND` operator

## Returns correct result when used on two `Boolean`s

### Juttle

    emit -from Date.new(0) -limit 1
      | put ff = false AND false
      | put ft = false AND true
      | put tf = true AND false
      | put tt = true AND true
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", ff: false, ft: false, tf: false, tt: true }

## Doesn't short-circuit

### Juttle

    function produceTypeError() {
      return null < null;
    }

    emit -from Date.new(0) -limit 1
      | put result = false AND produceTypeError()
      | view result


### Warnings

  * Invalid operand types for "<": null and null.

## Produces an error when used on invalid operand type combinations

### Juttle

    emit -from Date.new(0) -limit 1 | put result = null AND null | view result

### Errors

  * Invalid operand types for "AND": null and null.
