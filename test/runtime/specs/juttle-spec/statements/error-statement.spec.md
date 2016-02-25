# The `error` statement

## Produces an error with passed message

### Juttle

    function f() {
      error 'Boom!';
    }

    const c = f();

    emit

### Errors

  * Boom!

## Produces an error when passed a message of invalid type

### Juttle

    function f() {
      error null;
    }

    const c = f();

    emit

### Errors

  * error statement: Invalid message type (null).
