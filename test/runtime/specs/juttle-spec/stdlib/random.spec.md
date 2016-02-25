# juttle stdlib.random module

## exponential produces numbers > 0 for positive scale
### Juttle
    import "random.juttle" as random;
    emit -limit 1000 -from Date.new(0)
    | put x= random.exponential(1)
    | filter x > 0
    | reduce count()
    | view result

### Output
    {count: 1000}

## normal produces some numbers
### Juttle
    import "random.juttle" as random;
    emit -limit 1000 -from Date.new(0)
    | put x= random.normal(0, 1)
    | filter x > -Infinity and x < Infinity
    | reduce count()
    | view result

### Output
    {count: 1000}

## poisson produces integers >= 0
### Juttle
    import "random.juttle" as random;
    emit -limit 1000 -from Date.new(0)
    | put x= random.poisson(10)
    | put winning = x >=0 && x == Math.floor(x)
    | filter winning == true
    | reduce count()
    | view result

### Output
    {count: 1000}

## uniform produces numbers in (low...high)
### Juttle
    import "random.juttle" as random;
    emit -limit 1000 -from Date.new(0)
    | put x= random.uniform(1, 10)
    | filter x > 1 and x < 10
    | reduce count()
    | view result

### Output
    {count: 1000}
