# Input options

## Identifiers in multi-value options are not coerced to strings

Regression test for #444.

### Juttle

    input i: text -default a, b, c;

### Errors

  * CompileError: a is not defined

