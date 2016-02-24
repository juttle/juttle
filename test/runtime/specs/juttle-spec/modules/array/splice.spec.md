The `Array.splice` function
==============================

Produces an error when passed argument `array` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.splice(null) | view result

### Warnings

  * Invalid argument type for "Array.splice": expected array, received null.

Produces an error when passed argument `begin` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.splice([], null) | view result

### Warnings

  * Invalid argument type for "Array.splice": expected number, received null.

Produces an error when passed argument `end` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.splice([], 1, null) | view result

### Warnings

  * Invalid argument type for "Array.splice": expected number, received null.

Splices an array
--------------------------------------

### Juttle

    emit -limit 1 | put array = ["banana", "pajama"] | put elements = Array.splice(array, 0, 1, 'potatoes') | keep elements, array | view result

### Output

    { elements: ["banana"], array: ["potatoes", "pajama"] }
