# The `Math.floor` function

## Produces an error when passed an argument of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.floor(null) | view result

### Warnings

  * Invalid argument type for "Math.floor": expected number, received null.


## Produces an error when passed a digits argument of incorrect type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Math.floor(1, null) | view result

### Warnings

  * Invalid argument type for "Math.floor": expected number, received null.

## Floors numbers to specified digits

### Juttle

    const examples =
        Math.floor(55.59, 1) == 55.5 &&
        Math.floor(59, -1) == 50 &&
        Math.floor(-55.51, 1) == -55.6 &&
        Math.floor(-51, -1) == -60;

    emit -from Date.new(0) -limit 1
    | put winning = examples | keep winning | view result

### Output

    { winning: true }
