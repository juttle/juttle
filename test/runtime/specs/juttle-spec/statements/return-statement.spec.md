# The `return` statement

## Without value: Makes enclosing function return `null`

### Juttle

    function f() {
      return;
    }

    emit -from Date.new(0) -limit 1 | put result = f() | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: null }

## With value: Makes enclosing function return the value

### Juttle

    function f() {
      return 5;
    }

    emit -from Date.new(0) -limit 1 | put result = f() | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 5 }
