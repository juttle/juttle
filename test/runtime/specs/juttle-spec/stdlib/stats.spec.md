# juttle stdlib.stats module

## reducer demean(fld) subtracts the mean
### Juttle
    import "stats.juttle" as stats;
    emit -limit 5 -from Date.new(0)
    | put x = 2 * count()
    | reduce x = last(x), u = avg(x), xmu = stats.demean(x)
    | view result

### Output
    {x: 10, u:6, xmu: 4}

## reducer stddev(fld) computes the right thing
### Juttle
    import "stats.juttle" as stats;
    emit -limit 3 -from Date.new(0)
    | put x = 2 * count()
    | reduce s = stats.stddev(x)
    | view result

### Output
    {s: 2}

## reducer z(fld) computes the right thing
note the first output point is dropped because we
tried to do Math.floor(null)
### Juttle
    import "stats.juttle" as stats;
    emit -limit 3 -from Date.new(0)
    | put x = 2 * count()
    | reduce z = stats.z(x)
    | view result

### Output
    {z:1}

## reducer relMean(fld) divides by the mean
### Juttle
    import "stats.juttle" as stats;
    emit -limit 3 -from Date.new(0)
    | put x = 2 * count()
    | reduce x = last(x), u = avg(x), xdu = stats.relMean(x)
    | view result

### Output
    {x: 6, u:4, xdu: 1.5}

## reducer cv(fld) computes the coefficient of variation
### Juttle
    import "stats.juttle" as stats;
    emit -limit 100 -from Date.new(0)
    | put x = 2 * count()
    | reduce x = last(x), u = avg(x), sd = stats.stddev(x), cv = stats.cv(x)
    | put winning = cv == sd / u
    | keep winning
    | view result

### Output
    {winning: true}
