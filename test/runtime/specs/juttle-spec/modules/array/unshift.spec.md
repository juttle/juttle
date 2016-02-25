# The `Array.unshift` function

## Produces an error when passed argument `array` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.unshift(null, "efgh") | view result

### Warnings

  * Invalid argument type for "Array.unshift": expected array, received null.

## Unshifts an element

### Juttle

    emit -limit 1 | put array = ["banana"]
    | put elements = Array.unshift(array, 'pajama', 'potatoes')
    | keep elements, array
    | view result

### Output

    { elements: 3, array: ["pajama", "potatoes", "banana"] }
