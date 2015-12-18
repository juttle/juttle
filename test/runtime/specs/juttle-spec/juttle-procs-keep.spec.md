Juttle "keep" processor
=======================

Keeps specified fields
----------------------

### Juttle

    emit -from Date.new(0) -limit 3 | put a = 1, b = 2, c = 3, d = 4 | keep a, b, c | view result

### Output

    { a: 1, b: 2, c: 3 }
    { a: 1, b: 2, c: 3 }
    { a: 1, b: 2, c: 3 }


Ignores fields that don't exist in processed points
---------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 3 | put a = 1 | keep b | view result

### Output

    { }
    { }
    { }
