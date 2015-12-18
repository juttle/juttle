The `String.toLowerCase` function
=================================

Produces an error when passed an argument of invalid type
---------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.toLowerCase(null) | view result

### Warnings

  * Invalid argument type for "String.toLowerCase": expected string, received null.

Returns the expected lowercase string
-------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.toLowerCase('HEY') | keep result | view result

### Output
    
    { result: "hey" }
