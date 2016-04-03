# juttle stdlib.select module

## min selects the minimum value
### Juttle
    import "select" as select;
    emit -limit 5 -from Date.new(0)
    | put x = count()
    | select.min -field 'x'
    | keep x
    | view result

### Output
    {x: 1}

## max selects the maximum value
### Juttle
    import "select" as select;
    emit -limit 5 -from Date.new(0)
    | put x = count()
    | select.max -field 'x'
    | keep x
    | view result

### Output
    {x: 5}

## median selects the median value (odd)
### Juttle
    import "select" as select;
    emit -limit 5 -from Date.new(0)
    | put x = count()
    | select.median -field 'x'
    | keep x
    | view result

### Output
    {x: 3}

## median selects the median value (even)
### Juttle
    import "select" as select;
    emit -limit 6 -from Date.new(0)
    | put x = count()
    | select.median -field 'x'
    | keep x
    | view result

### Output
    {x: 3}

## percentile selects the 75th percentile point
### Juttle
    import "select" as select;
    emit -limit 10 -from Date.new(0)
    | put x = count()
    | select.percentile -field 'x' -p 0.75
    | keep x
    | view result

### Output
    {x: 8}

## min selects the minimum value by group
### Juttle
    import "select" as select;
    emit -limit 10 -from Date.new(0)
    | put x = count(), parity = x % 2
    | select.min -field 'x' -by 'parity'
    | sort parity
    | view result

### Output
    {parity:0, x: 2}
    {parity:1, x: 1}

## max selects the maximum value by group
### Juttle
    import "select" as select;
    emit -limit 10 -from Date.new(0)
    | put x = count(), parity = x % 2
    | select.max -field 'x' -by 'parity'
    | sort parity
    | view result

### Output
    {parity:0, x: 10}
    {parity:1, x: 9}

## median selects the median value by group
### Juttle
    import "select" as select;
    emit -limit 10 -from Date.new(0)
    | put x = count(), parity = x % 2
    | select.median -field 'x' -by 'parity'
    | sort parity
    | view result

### Output
    {parity:0, x: 6}
    {parity:1, x: 5}

## percentile selects the 75th percentile point by group
### Juttle
    import "select" as select;
    emit -limit 20 -from Date.new(0)
    | put x = count(), parity = x % 2
    | select.percentile -field 'x' -p 0.75  -by 'parity'
    | sort parity
    | view result

### Output
    {parity:0, x: 16}
    {parity:1, x: 15}

## min selects the minimum value, batched
### Juttle
    import "select" as select;
    emit -limit 20 -from Date.new(0)
    | put x = count(), parity = x % 2
    | batch :10s:
    | select.min -field 'x' -by 'parity'
    | sort parity
    | keep x, parity
    | view result

### Output
    {parity:0, x: 2}
    {parity:1, x: 1}
    {parity:0, x: 12}
    {parity:1, x: 11}

## max selects the maximum value, batched
### Juttle
    import "select" as select;
    emit -limit 20 -from Date.new(0)
    | put x = count(), parity = x % 2
    | batch :10s:
    | select.max -field 'x' -by 'parity'
    | sort parity
    | keep x, parity
    | view result

### Output
    {parity:0, x: 10}
    {parity:1, x: 9}
    {parity:0, x: 20}
    {parity:1, x: 19}

## median selects the median value, batched
### Juttle
    import "select" as select;
    emit -limit 20 -from Date.new(0)
    | put x = count(), parity = x % 2
    | batch :10s:
    | select.median -field 'x' -by 'parity'
    | sort parity
    | keep x, parity
    | view result

### Output
    {parity:0, x: 6}
    {parity:1, x: 5}
    {parity:0, x: 16}
    {parity:1, x: 15}

## percentile selects the 75th percentile point, batched
### Juttle
    import "select" as select;
    emit -limit 40 -from Date.new(0)
    | put x = count(), parity = x % 2
    | batch :20s:
    | select.percentile -field 'x' -p 0.75  -by 'parity'
    | sort parity
    | keep x, parity
    | view result

### Output
    {parity:0, x: 16}
    {parity:1, x: 15}
    {parity:0, x: 36}
    {parity:1, x: 35}

## top selects the 5 largest values
### Juttle
    import "select.juttle" as select;
    emit -limit 10 -from Date.new(0)
    | put x = 10-count()
    | select.top -n 5 -by 'x'
    | keep x
    | view result

### Output
    {x: 9}
    {x: 8}
    {x: 7}
    {x: 6}
    {x: 5}

## bottom selects the 5 smallest values
### Juttle
    import "select.juttle" as select;
    emit -limit 10 -from Date.new(0)
    | put x = 10-count()
    | select.bottom -n 5 -by 'x'
    | keep x
    | view result

### Output
    {x: 0}
    {x: 1}
    {x: 2}
    {x: 3}
    {x: 4}

## top selects the largest value per batch
### Juttle
    import "select.juttle" as select;
    emit -limit 9 -from Date.new(0)
    | put x = count()
    | batch -every :3s:
    | select.top -n 1 -by 'x'
    | keep x
    | view result

### Output
    { x: 3 }
    { x: 6 }
    { x: 9 }

## bottom selects the smallest value per batch
### Juttle
    import "select.juttle" as select;
    emit -limit 9 -from Date.new(0)
    | put x = count()
    | batch -every :3s:
    | select.bottom -n 1 -by 'x'
    | keep x
    | view result

### Output
    { x: 1 }
    { x: 4 }
    { x: 7 }

## top selects the 5 largest values from 3 element stream
### Juttle
    import "select.juttle" as select;
    emit -limit 3 -from Date.new(0)
    | put x = 3-count()
    | select.top -n 5 -by 'x'
    | keep x
    | view result

### Output
    {x: 2}
    {x: 1}
    {x: 0}

## bottom selects the 5 smallest values from 3 element stream
### Juttle
    import "select.juttle" as select;
    emit -limit 3 -from Date.new(0)
    | put x = 3-count()
    | select.bottom -n 5 -by 'x'
    | keep x
    | view result

### Output
    {x: 0}
    {x: 1}
    {x: 2}

## top can correctly modify the underlying sort limit
### Juttle
    import "select.juttle" as select;
    emit -limit 6 -from Date.new(0)
    | put x = 6-count()
    | select.top -n 5 -by 'x' -limit 5
    | keep x
    | view result

### Warnings
 
  * sort limit of 5 exceeded, dropping points

### Output
    {x: 5}
    {x: 4}
    {x: 3}
    {x: 2}
    {x: 1}

## bottom can correctly modify the underlying sort limit
### Juttle
    import "select.juttle" as select;
    emit -limit 6 -from Date.new(0)
    | put x = 6-count()
    | select.bottom -n 5 -by 'x' -limit 5
    | keep x
    | view result

### Warnings
 
  * sort limit of 5 exceeded, dropping points

### Output
    {x: 1}
    {x: 2}
    {x: 3}
    {x: 4}
    {x: 5}
