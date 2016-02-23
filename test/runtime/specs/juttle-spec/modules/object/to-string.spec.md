The `Object.toString` function
==============================

Returns correct result when passed an object
-------------------------------------------

### Juttle

    emit -limit 1 | put result = Object.toString({x: 1}) | keep result | view result

### Output

    { result: "{ x: 1 }" }

Produces an error when passed an argument of invalid type
---------------------------------------------------------

### Juttle

    emit -limit 1 | put result = Object.toString(null) | view result

### Warnings

  * Invalid argument type for "Object.toString": expected object, received null.
