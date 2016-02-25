# The `reducer` statement

## Optional parameters can be expressions

### Juttle

    reducer r(a = 5 + 6 * 7) {
      function update() {
      }

      function result() {
        return a;
      }
    }

    emit -from Date.new(0) -limit 1 | put result = r() | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 47 }

## Optional parameters can depend on previous parameters

### Juttle

    reducer r(a, b = a * 2) {
      function update() {
      }

      function result() {
        return [a, b];
      }
    }

    emit -from Date.new(0) -limit 1 | put result = r(1) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [1, 2] }

## Produces an error when a required parameter follows an optional parameter

### Juttle

    reducer r(a = 5, b) {
      function update() {
      }

      function result() {
      }
    }

### Errors

  * A required parameter cannot follow an optional parameter.
