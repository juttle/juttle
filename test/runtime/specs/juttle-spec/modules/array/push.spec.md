The `Array.push` function
==============================

Produces an error when passed argument `array` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.push(null, "efgh") | view result

### Warnings

  * Invalid argument type for "Array.push": expected array, received null.

Pushes an element
--------------------------------------

### Juttle

    emit -limit 1 | put array = ["banana"] | put elements = Array.push(array, 'pajama', 'potatoes') | keep elements, array | view result

### Output

    { elements: 3, array: ["banana", "pajama", "potatoes"] }
