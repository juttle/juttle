# The `String.split` function

## Produces an error when passed argument `string` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.split(null, "efgh") | view result

### Warnings

  * Invalid argument type for "String.split": expected string, received null.

## Produces an error when passed argument `separator` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.split("abcd", null) | view result

### Warnings

  * Invalid argument type for "String.split": expected string or regular expression, received null.

## Splits string into an array based on a separator

### Juttle

    emit -limit 1 | put elements = String.split('joe,meg,bob,may', ',') | keep elements | view result

### Output

    { elements: ["joe","meg","bob","may"] } 

## Returns a list with a single element

### Juttle

    emit -limit 1 | put elements = String.split('banana', '.') | keep elements | view result

### Output

    { elements: ["banana"] } 
