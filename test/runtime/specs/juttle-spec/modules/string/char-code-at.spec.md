# The `String.charCodeAt` function

## Produces an error when passed a non-string first argument

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.charCodeAt(null, 2) | view result

### Warnings

  * Invalid argument type for "String.charCodeAt": expected string, received null.


## Produces an error when passed a non-number second argument

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.charCodeAt('hello', 'potatoes') | view result

### Warnings

  * Invalid argument type for "String.charCodeAt": expected number, received string (potatoes).

## charCodeAt works as expected

### Juttle

    emit -from Date.new(0) -limit 1
    | put hello = 'hello', world='world'
    | put message = String.charCodeAt('hello', 1)
    | keep message
    | view result

### Output

    { message: 101 }
