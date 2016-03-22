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

## reducer demean(fld) a stream of zeros
### Juttle
    import "stats.juttle" as stats;
    emit -limit 5 -from Date.new(0)
    | put x = 0
    | reduce x = last(x), u = avg(x), xmu = stats.demean(x)
    | view result

### Output
    {x: 0, u:0, xmu: 0}

## reducer stdev(fld) computes the right thing
### Juttle
    import "stats.juttle" as stats;
    emit -limit 3 -from Date.new(0)
    | put x = 2 * count()
    | reduce s = stats.stdev(x)
    | view result

### Output
    {s: 1.632993161855452}

## reducer stdev(fld) handles a stream of zeros
### Juttle
    import "stats.juttle" as stats;
    emit -limit 3 -from Date.new(0)
    | put x = 0
    | reduce s = stats.stdev(x)
    | view result

### Output
    {s: 0}

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
    {z:1.224744871391589}

## reducer z(fld) handles a stream of zeros
note the first output point is dropped because we
tried to do Math.floor(null)
### Juttle
    import "stats.juttle" as stats;
    emit -limit 3 -from Date.new(0)
    | put x = 0
    | reduce z = stats.z(x)
    | view result

### Output
    {z:NaN}

## reducer relMean(fld) divides by the mean
### Juttle
    import "stats.juttle" as stats;
    emit -limit 3 -from Date.new(0)
    | put x = 2 * count()
    | reduce x = last(x), u = avg(x), xdu = stats.relMean(x)
    | view result

### Output
    {x: 6, u:4, xdu: 1.5}

## reducer relMean(fld) handles a stream of zeros
### Juttle
    import "stats.juttle" as stats;
    emit -limit 3 -from Date.new(0)
    | put x = 0
    | reduce x = last(x), u = avg(x), xdu = stats.relMean(x)
    | view result

### Output
    {x: 0, u:0, xdu: NaN}

## reducer cv(fld) computes the coefficient of variation
### Juttle
    import "stats.juttle" as stats;
    emit -limit 100 -from Date.new(0)
    | put x = 2 * count()
    | reduce x = last(x), u = avg(x), sd = stats.stdev(x), cv = stats.cv(x)
    | put winning = cv == sd / u
    | keep winning
    | view result

### Output
    {winning: true}

## reducer cv(fld) handles a stream of zeros
### Juttle
    import "stats.juttle" as stats;
    emit -limit 5 -from Date.new(0)
    | put x = 0
    | reduce x = last(x), u = avg(x), sd = stats.stdev(x), cv = stats.cv(x)
    | view result

### Output
    { x: 0, u: 0, sd: 0, cv: NaN }
