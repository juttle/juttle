The `OR` operator
=================

Returns correct result when used on two `Boolean`s
--------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put ff = false OR false
      | put ft = false OR true
      | put tf = true OR false
      | put tt = true OR true
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", ff: false, ft: true, tf: true, tt: true }

Doesn't short-circuit
---------------------

### Juttle

    function produceTypeError() {
      return null < null;
    }

    emit -from Date.new(0) -limit 1
      | put result = true OR produceTypeError()
      | view result

### Warnings

  * Invalid operand types for "<": null and null.

Produces an error when used on invalid operand type combinations
----------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = null OR null | view result

### Errors

  * Invalid operand types for "OR": null and null.
