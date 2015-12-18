The `String.slice` function
===========================

Produces an error when passed argument `string` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.slice(null, 5, 6) | view result

### Warnings

  * Invalid argument type for "String.slice": expected string, received null.

Produces an error when passed argument `start` of invalid type
--------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.slice("abcd", null, 6) | view result

### Warnings

  * Invalid argument type for "String.slice": expected number, received null.

Produces an error when passed argument `end` of invalid type
------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.slice("abcd", 5, null) | view result

### Warnings

  * Invalid argument type for "String.slice": expected number, received null.

Returns the correct end slice of a string
-----------------------------------------

### Juttle

    emit -limit 1 | put message = String.slice('FizzBuzz', 4) | keep message | view result

### Output

    { message: "Buzz" } 

Returns the correct head slice of the string
--------------------------------------------

### Juttle

    emit -limit 1 | put message = String.slice('FizzBuzz', 0, 4) | keep message | view result

### Output

    { message: "Fizz" } 

Returns the correct middle slice of the string
----------------------------------------------

### Juttle

    emit -limit 1 | put message = String.slice('FizzBuzz', 1, 6) | keep message | view result

### Output

    { message: "izzBu" } 
