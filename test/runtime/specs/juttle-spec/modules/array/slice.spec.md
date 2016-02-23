The `Array.slice` function
==============================

Produces an error when passed argument `array` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.slice(null) | view result

### Warnings

  * Invalid argument type for "Array.slice": expected array, received null.

Produces an error when passed argument `begin` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.slice([], null) | view result

### Warnings

  * Invalid argument type for "Array.slice": expected number, received null.

Produces an error when passed argument `end` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.slice([], 1, null) | view result

### Warnings

  * Invalid argument type for "Array.slice": expected number, received null.

Slices an array
--------------------------------------

### Juttle

    emit -limit 1 | put array = ["banana", "pajama"] | put elements = Array.slice(array, 0, 1) | keep elements, array | view result

### Output

    { elements: ["banana"], array: ["banana", "pajama"] }
