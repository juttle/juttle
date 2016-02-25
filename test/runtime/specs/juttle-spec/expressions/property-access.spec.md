# Property access

## Returns correct result for module const access inside a function

Regression test for PROD-6873.

### Juttle

    function pi() {
      return Math.PI;
    }

    emit -from Date.new(0) -limit 1 | put result = pi() == Math.PI | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: true }

## Returns correct result when indexing a function call result inside a function

Regression test for PROD-6873.

### Juttle

    function split(string, index) {
      return String.split(string, ',')[index];
    }

    emit -from Date.new(0) -limit 1 | put result = split('a,b,c', 1) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: "b" }
