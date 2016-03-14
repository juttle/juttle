# User-defined reducers

## Can't contain statement blocks

### Juttle

    reducer r() {
      { }
    }

    emit

### Errors

  * Cannot use a block at the top level of a reducer.

## Can't contain expression statements

### Juttle

    reducer r() {
      5;
    }

    emit

### Errors

  * Cannot use an expression statement at the top level of a reducer.

## Can't contain `if` statements

### Juttle

    reducer r() {
      if (true) {
      }
    }

    emit

### Errors

  * Cannot use an if statement at the top level of a reducer.

## Can't contain `return` statements

### Juttle

    reducer r() {
      return;
    }

    emit

### Errors

  * Cannot use a return statement at the top level of a reducer.
