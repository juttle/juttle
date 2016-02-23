The `String.charAt` function
============================

Produces an error when passed a non-string first argument
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.charAt(null, 2) | view result

### Warnings

  * Invalid argument type for "String.charAt": expected string, received null.


Produces an error when passed a non-number second argument
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.charAt('hello', 'potatoes') | view result

### Warnings

  * Invalid argument type for "String.charAt": expected number, received string (potatoes).

charAt works as expected
-------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
    | put hello = 'hello', world='world'
    | put message = String.charAt('hello', 1)
    | keep message
    | view result

### Output

    { message: "e" }
