# The `Math.ceil` function

## Produces an error when passed an argument of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.ceil(null) | view result

### Warnings

  * Invalid argument type for "Math.ceil": expected number, received null.

## Produces an error when passed a digits argument of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.ceil(1, null) | view result

### Warnings

  * Invalid argument type for "Math.ceil": expected number, received null.

## Ceils numbers to specified digits

### Juttle

    const examples =
        Math.ceil(55.51, 1) == 55.6 &&
        Math.ceil(51, -1) == 60 &&
        Math.ceil(-55.59, 1) == -55.5 &&
        Math.ceil(-59, -1) == -50;

    emit -from Date.new(0) -limit 1
    | put winning = examples | keep winning | view result

### Output

    { winning: true }
