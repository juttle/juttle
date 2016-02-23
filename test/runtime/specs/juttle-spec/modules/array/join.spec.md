The `Array.join` function
==============================

Produces an error when passed argument `array` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.join(null, "efgh") | view result

### Warnings

  * Invalid argument type for "Array.join": expected array, received null.

Produces an error when passed argument `joiner` of invalid type
------------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.join([], null) | view result

### Warnings

  * Invalid argument type for "Array.join": expected string, received null.

Splits array into an array based on a separator
------------------------------------------------

### Juttle

    emit -limit 1 | put people = Array.join(['joe','meg','bob','may'], ',') | keep people | view result

### Output

    { people: "joe,meg,bob,may" }

Returns a string with a single element
--------------------------------------

### Juttle

    emit -limit 1 | put elements = Array.join(['banana'], '.') | keep elements | view result

### Output

    { elements: "banana" }
