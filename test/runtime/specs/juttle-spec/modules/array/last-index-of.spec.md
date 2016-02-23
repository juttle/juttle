The `Array.lastIndexOf` function
=============================

Returns correct result with string search
----------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.lastIndexOf(['A','B', 'B'], 'B') | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 2 }

Returns correct result with number search
----------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.lastIndexOf([1,'B',1], 1) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 2 }

Returns correct result with non-primitive search
----------------------

### Juttle
    const a = ['a'];
    emit -from Date.new(0) -limit 1 | put result = Array.lastIndexOf([1,a,a], a) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 2 }

Returns correct result when item not found
--------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.lastIndexOf([1,2], 3) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: -1 }

Returns correct result when non-primitive item not found
--------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.lastIndexOf([1,2], [1]) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: -1 }

Produces an error when passed argument `array` of incorrect type
-----------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.lastIndexOf(null, '1') | view result

### Warnings

  * Invalid argument type for "Array.lastIndexOf": expected array, received null.
