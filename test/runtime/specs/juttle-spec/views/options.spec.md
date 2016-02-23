View options
============

Identifiers in multi-value options are not coerced to strings
-------------------------------------------------------------

Regression test for #444.

### Juttle

    view text -format a, b, c

### Errors

  * CompileError: a is not defined
