# Arrays


## Assign to array (literal index)

### Juttle

    function f() {
       var a = [0, 1, 2];
       a[0] = 10;
       return a[0];
    }

    emit -limit 1 | put v = f() | keep v | view result

### Output

    {v: 10}




## Assign to array (expression index)

### Juttle

    function f(i) {
       var a = [0, 1, 2];
       return a[i + 1];
    }

    emit -limit 1 | put v = f(1) | keep v | view result

### Output

    {v: 2}
