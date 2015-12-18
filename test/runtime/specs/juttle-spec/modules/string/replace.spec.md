The `String.replace` function
==============================

Returns correct result for String.replace with string
-----------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.replace("hayneedlehay", "needle", "replace") | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "hayreplacehay" }

Returns correct result for String.replace with regex
----------------------------------------------------

### Juttle

        emit -from Date.new(0) -limit 1 | put result = String.replace("hayneeeeeeedlehay", /ne+dle/, "replace") | view result

### Output

        { "time": "1970-01-01T00:00:00.000Z", result: "hayreplacehay" }

Produces an error when passed argument `string` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.replace(null, "efgh", "ijkl") | view result

### Warnings

  * Invalid argument type for "String.replace": expected string, received null.

Produces an error when passed argument `searchValue` of invalid type
--------------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.replace("abcd", null, "ijkl") | view result

### Warnings

  * Invalid argument type for "String.replace": expected string or regular expression, received null.

Produces an error when passed argument `replaceValue` of invalid type
---------------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.replace("abcd", "efgh", null) | view result

### Warnings

  * Invalid argument type for "String.replace": expected string, received null.
