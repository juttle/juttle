# The unary `*` operator

## Processes its argument as rvalue

Regression test for #598.

### Juttle

    function f() {
    }
    
    emit -from :0: -limit 1 | put *f['x'] = 5

### Errors

  * Cannot use a function as a variable
