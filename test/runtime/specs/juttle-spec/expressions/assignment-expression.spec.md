# Assignment expression

This is a simple temporary test before #419 gets fully implemented, making
indexed assignment work properly in all cases. That work will be covered by
additional, more detailed tests. Once done, this test will become redundant and
can be scrapped.

## Can assign to indexed expressions

### Juttle

    function f() {
      var v = [1, 2, 3];
      const c = v[1] = 4;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: [1, 4, 3] }
