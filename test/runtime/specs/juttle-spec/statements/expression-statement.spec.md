# Expression statement

## Supports non-assignment expressions

### Juttle

    function f() {
      5;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: null }

## Supports the `*=` operator

### Juttle

    function f() {
      var v = 5;
      v *= 6;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 30 }

## Supports the `/=` operator

### Juttle

    function f() {
      var v = 30;
      v /= 5;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 6 }

## Supports the `%=` operator

### Juttle

    function f() {
      var v = 30;
      v %= 5;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 0 }

## Supports the `+=` operator

### Juttle

    function f() {
      var v = 5;
      v += 6;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 11 }

## Supports the `-=` operator

### Juttle

    function f() {
      var v = 6;
      v -= 5;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 1 }

## Supports the `<<=` operator

### Juttle

    function f() {
      var v = 5;
      v <<= 1;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 10 }

## Supports the `>>=` operator

### Juttle

    function f() {
      var v = 5;
      v >>= 1;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 2 }

## Supports the `>>>=` operator

### Juttle

    function f() {
      var v = 5;
      v >>= 1;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 2 }

## Supports the `&=` operator

### Juttle

    function f() {
      var v = 5;
      v &= 6;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 4 }

## Supports the `^=` operator

### Juttle

    function f() {
      var v = 5;
      v ^= 6;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 3 }

## Supports the `|=` operator

### Juttle

    function f() {
      var v = 5;
      v |= 6;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 7 }
