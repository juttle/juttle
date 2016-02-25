# The `&&` operator

## Returns correct result when used on two `Boolean`s

### Juttle

    emit -from Date.new(0) -limit 1
      | put ff = false && false
      | put ft = false && true
      | put tf = true && false
      | put tt = true && true
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", ff: false, ft: false, tf: false, tt: true }

## Short-circuits

### Juttle

    function produceTypeError() {
      return null < null;
    }

    emit -from Date.new(0) -limit 1
      | put result = false && produceTypeError()
      | view result


### Output

    { "time": "1970-01-01T00:00:00.000Z", result: false }

## Produces an error when used on invalid operand type combinations

### Juttle

    emit -from Date.new(0) -limit 1 | put result = null && null | view result

### Errors

  * "&&" operator: Invalid operand type (null).
