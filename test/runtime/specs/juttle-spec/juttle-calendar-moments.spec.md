# Juttle calendar moments

## rejects noninteger calendar durations, humanized
### Juttle
    emit -limit 1
    | put one = :1.5 months:
    | remove time
    | view result

### Errors
   * Expected

## rejects mixed calendar durations for quantization
### Juttle
    emit -from :2014-01-15: -every :month: -limit 5
    | put t=time, m=:1/02.03:04:05:, d=Date.quantize(time, m)
    | view result

### Errors
   * Date.quantize doesn't accept mixed calendar intervals:

## calendar durations
### Juttle
    emit -limit 1
    | put one = :1 month and 3 hours: == :1/0.03:00:00:
    | put two = :-1 month and 2 days: == :-1/2.00:00:00: // ago
    | put three = (-1 * :1 month and 2 days and 3 seconds:)  == Duration.new('-1/-2.00:00:03')
    | put four = -3 * :month: == Duration.new('-3M')
    | put five = :2 days: == Duration.new('2d')
    | put six = :0s: == Duration.new('00:00:00.000')
    | remove time
    | view result

### Output
    {"one":true, "two":true, "three":true, "four":true, "five":true, "six":true}


## calendar duration abbreviations work
### Juttle
    emit -limit 1
    | put one = :-M: == :1 month ago:
    | put two = :-2y: == :2 years ago:
    | put three = :2014-01-15: + 3 * :M: == :2014-04-15:
    | put four = :2014-01-15: + 4 * :y: == :2018-01-15:
    | remove time
    | view result

### Output
    {"one":true, "two":true, "three":true, "four":true}

## math with calendar durations works
### Juttle
    emit -limit 1
    | put one = :now: - :month: == :1 month ago:
    | put two = :now: - :2 months: == :2 months ago:
    | put three = :now: - 3 * :month: == :3 months ago:
    | put four = :2014-01-15: + 4 * :months: == :2014-05-15:
    | put five =  :1.10:00:00: - :30 hours: == :04:00:00:
    | put six =  :30 hours: - :1.10:00:00:  == Duration.new('-04:00:00')
    | put seven =  :2/1.10:00:00: - :30 days: == Duration.new('2/-28.14:00:00')
    | put eight =  :30 days: - :2/1.10:00:00:  == Duration.new('-2/28.14:00:00')
    | put nine = (:1 day: + :10 hours:) - :30 hours: == :04:00:00:
    | remove time
    | view result

### Output
    { "one":true, "two":true, "three":true, "four":true,
      "five":true, "six":true, "seven":true, "eight":true, "nine":true }

## emit increments in months
### Juttle
    emit -from :2000-01-15: -every :month: -limit 5
    | view result

### Output
    {"time":"2000-01-15T00:00:00.000Z"}
    {"time":"2000-02-15T00:00:00.000Z"}
    {"time":"2000-03-15T00:00:00.000Z"}
    {"time":"2000-04-15T00:00:00.000Z"}
    {"time":"2000-05-15T00:00:00.000Z"}

## emit increments in years
### Juttle
    emit -from :2000-01-15: -every :year: -limit 5
    | view result

### Output
    {"time":"2000-01-15T00:00:00.000Z"}
    {"time":"2001-01-15T00:00:00.000Z"}
    {"time":"2002-01-15T00:00:00.000Z"}
    {"time":"2003-01-15T00:00:00.000Z"}
    {"time":"2004-01-15T00:00:00.000Z"}

## quantize works for weeks
### Juttle
    emit -from :2014-01-15: -every :week: -limit 5
    | put d=Date.quantize(time, :week:)
    | view result

### Output
    {"time":"2014-01-15T00:00:00.000Z","d":"2014-01-09T00:00:00.000Z"}
    {"time":"2014-01-22T00:00:00.000Z","d":"2014-01-16T00:00:00.000Z"}
    {"time":"2014-01-29T00:00:00.000Z","d":"2014-01-23T00:00:00.000Z"}
    {"time":"2014-02-05T00:00:00.000Z","d":"2014-01-30T00:00:00.000Z"}
    {"time":"2014-02-12T00:00:00.000Z","d":"2014-02-06T00:00:00.000Z"}

## quantize works for months
### Juttle
    emit -from :2014-01-15: -every :month: -limit 5
    | put d=Date.quantize(time, :month:)
    | view result

### Output
    {"time":"2014-01-15T00:00:00.000Z","d":"2014-01-01T00:00:00.000Z"}
    {"time":"2014-02-15T00:00:00.000Z","d":"2014-02-01T00:00:00.000Z"}
    {"time":"2014-03-15T00:00:00.000Z","d":"2014-03-01T00:00:00.000Z"}
    {"time":"2014-04-15T00:00:00.000Z","d":"2014-04-01T00:00:00.000Z"}
    {"time":"2014-05-15T00:00:00.000Z","d":"2014-05-01T00:00:00.000Z"}

## quantize works for years
### Juttle
    emit -from :2000-06-15: -every :year: -limit 5
    | put d=Date.quantize(time, :year:)
    | view result

### Output
    {"time":"2000-06-15T00:00:00.000Z","d":"2000-01-01T00:00:00.000Z"}
    {"time":"2001-06-15T00:00:00.000Z","d":"2001-01-01T00:00:00.000Z"}
    {"time":"2002-06-15T00:00:00.000Z","d":"2002-01-01T00:00:00.000Z"}
    {"time":"2003-06-15T00:00:00.000Z","d":"2003-01-01T00:00:00.000Z"}
    {"time":"2004-06-15T00:00:00.000Z","d":"2004-01-01T00:00:00.000Z"}

## ok to subtract a plain moment from an epsilon moment
### Juttle
    emit -from Date.new(0) -limit 1
    | reduce -every :s: t=max(time)
    | put dt = time - t
    | view result

### Output
    {"time":"1970-01-01T00:00:01.000Z","t":"1970-01-01T00:00:00.000Z","dt":"00:00:01.000"}

## ok to subtract an epsilon moment from a plain moment
### Juttle
    emit -from Date.new(0) -limit 1
    | reduce -every :s: t=max(time)
    | put dt = t - time
    | view result

### Output
    {"time":"1970-01-01T00:00:01.000Z","t":"1970-01-01T00:00:00.000Z","dt":"-00:00:01.000"}

## quantize truncates non-calendar epsilon moments correctly
### Juttle
    emit -from Date.new(0) -limit 1
    | reduce -every :s: t=max(time)
    | put winning = Date.quantize(time, :s:) == t
    | view result

### Output
    {"time":"1970-01-01T00:00:01.000Z","t":"1970-01-01T00:00:00.000Z","winning":true}

## noninteger day constants are handled
### Juttle
    emit -from Date.new(0) -limit 1
    | put halfday = :d:/2
    | view result

### Output
    {"time":"1970-01-01T00:00:00.000Z", "halfday":"12:00:00.000"}

## noninteger day math works
### Juttle
    function fraction(interval, n) {
        // defeat the d-bit!
        return interval / n;
    }
    emit -from Date.new(0) -limit 1 -every :d:
    | put before = time - fraction(:d:, 2)
    | put after = time + fraction(:d:, 2)
    | view result

### Output
    {"time":"1970-01-01T00:00:00.000Z","before":"1969-12-31T12:00:00.000Z","after":"1970-01-01T12:00:00.000Z"}

## noninteger hour constants are handled
### Juttle
    emit -from Date.new(0) -limit 1
    | put halfhour = :h:/2
    | view result

### Output
    {"time":"1970-01-01T00:00:00.000Z", "halfhour":"00:30:00.000"}

## noninteger hour math works
### Juttle
    function fraction(interval, n) {
        // defeat the d-bit!
        return interval / n;
    }
    emit -from Date.new(0) -limit 1 -every :d:
    | put before = time - fraction(:h:, 2)
    | put after = time + fraction(:h:, 2)
    | view result

### Output
    {"time":"1970-01-01T00:00:00.000Z","before":"1969-12-31T23:30:00.000Z","after":"1970-01-01T00:30:00.000Z"}

## quantize truncates calendar epsilon moments correctly
### Juttle
    emit -from Date.new(0) -limit 1
    | reduce -every :month: t=max(time)
    | put winning = Date.quantize(time, :month:) == t
    | view result

### Output
    {"time":"1970-02-01T00:00:00.000Z","t":"1970-01-01T00:00:00.000Z","winning":true}
