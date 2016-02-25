# Proc options

## Identifiers in multi-value options are not coerced to strings

Regression test for #444.

### Juttle

    emit -limit a, b, c

### Errors

  * CompileError: a is not defined
