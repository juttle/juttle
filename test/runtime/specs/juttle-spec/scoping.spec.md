Scoping
=======

Calls like `count()` in streaming expressions always refer to the built-in reducer
----------------------------------------------------------------------------------

Regression test for PROD-9211.

### Juttle

    sub count() {
      put c = count()   // This should *not* be resolved as a refrence to the
                        // defined sub.
    }

    emit -from Date.new(0) -limit 1 | put c = count() | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", c: 1 }
