Function definition
===================

Returns `null` when no `return` statement is executed
-----------------------------------------------------

### Juttle

    function f() {
    }

    emit -from Date.new(0) -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: null }
