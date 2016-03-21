# Juttle batch command

## batch -every and interval complains
### Juttle
    emit -from :2014-01-15: -limit 6
    | batch -every :2s: :2s:
    | reduce c=count()
    | view result

### Errors

   * Specify either batch -every or batch :interval:

## batch -every and number complains
no bare numbers with the new -every option
### Juttle
    emit -from :2014-01-15: -limit 6
    | batch -every 2
    | reduce c=count()
    | view result

### Errors

   * CompileError: -every wants a duration, got 2

## complains if batch -on > -every

### Juttle
    emit -from :2014-01-15: -limit 6
    | batch -every :minute: -on :hour:
    | reduce c=count()
    | view result

### Errors

   * CompileError: batch -on cannot be greater than -every

## complains if batch -every is negative

### Juttle
    emit -from :2014-01-15: -limit 6
    | batch -every -:minute:
    | reduce c=count()
    | view result

### Errors

   * CompileError: batch interval must be a positive number or duration.

## complains if batch -every is 0

### Juttle
    emit -from :2014-01-15: -limit 6
    | batch -every :0s:
    | reduce c=count()
    | view result

### Errors

   * CompileError: batch interval must be a positive number or duration.

## complains if batch duration is negative

### Juttle
    emit -from :2014-01-15: -limit 6
    | batch -:minute:
    | reduce c=count()
    | view result

### Errors

   * CompileError: batch interval must be a positive number or duration.

## complains if batch duration is 0

### Juttle
    emit -from :2014-01-15: -limit 6
    | batch :0s:
    | reduce c=count()
    | view result

### Errors

   * CompileError: batch interval must be a positive number or duration.

## batching works for months
### Juttle
    emit -from :2014-01-15: -every :month: -limit 5
    | batch -every :month:
    | reduce c=count()
    | view result

### Output
    {"time":"2014-02-01T00:00:00.000Z","c":1, "interval": "1M"}
    {"time":"2014-03-01T00:00:00.000Z","c":1, "interval": "1M"}
    {"time":"2014-04-01T00:00:00.000Z","c":1, "interval": "1M"}
    {"time":"2014-05-01T00:00:00.000Z","c":1, "interval": "1M"}
    {"time":"2014-06-01T00:00:00.000Z","c":1, "interval": "1M"}


## batching works for years
### Juttle
    emit -from :2000-01-15: -every :month: -limit 36
    | batch -every :year:
    | reduce c=count()
    | view result

### Output
    {"time":"2001-01-01T00:00:00.000Z","c":12, "interval": "12M"}
    {"time":"2002-01-01T00:00:00.000Z","c":12, "interval": "12M"}
    {"time":"2003-01-01T00:00:00.000Z","c":12, "interval": "12M"}


## batch can align on a regular duration
### Juttle
    emit -from :2014-01-01: -every :10 minute: -limit 30
    | batch -every :hour: -on :00:30:00:
    | reduce c=count()
    | view result

### Output
    {"time":"2014-01-01T00:30:00.000Z","c":3, "interval": "01:00:00.000" }
    {"time":"2014-01-01T01:30:00.000Z","c":6, "interval": "01:00:00.000" }
    {"time":"2014-01-01T02:30:00.000Z","c":6, "interval": "01:00:00.000" }
    {"time":"2014-01-01T03:30:00.000Z","c":6, "interval": "01:00:00.000" }
    {"time":"2014-01-01T04:30:00.000Z","c":6, "interval": "01:00:00.000" }
    {"time":"2014-01-01T05:30:00.000Z","c":3, "interval": "01:00:00.000" }

## batch can align on a regular duration with a calendar interval
### Juttle
    emit -from :2014-01-01: -every :day: -limit 60
    | batch -every :month: -on :day 10:
    | reduce c=count()
    | view result

### Output
    { "c": 9, "time": "2014-01-10T00:00:00.000Z", "interval": "1M" }
    { "c": 31, "time": "2014-02-10T00:00:00.000Z", "interval": "1M" }
    { "c": 20, "time": "2014-03-10T00:00:00.000Z", "interval": "1M" }


## batch can align on a date with a calendar interval
### Juttle
    emit -from :2014-01-01: -every :day: -limit 70
    | batch -every :month: -on :day 20 of this month:
    | reduce c=count()
    | view result

### Output
    { "c": 19, "time": "2014-01-20T00:00:00.000Z", "interval": "1M" }
    { "c": 31, "time": "2014-02-20T00:00:00.000Z", "interval": "1M" }
    { "c": 20, "time": "2014-03-20T00:00:00.000Z", "interval": "1M" }


## batch with short interval can handle a very large time gap
### Juttle
    // The merge of two different streams will cause separate calls
    // to batch's consume() for pts1 and pts2.  With a large gap in
    // the middle of pts1, this ensures that we handle that gap as
    // well as a subsequent call to consume() with later points
    const pts1 = [
      { time: :2015-03-18T00:00:00:, what: "start" },
      { time: :2015-03-21T00:00:00:, what: "middle" }
    ];
    const pts2 = [
      { time: :2015-03-21T00:01:00:, what: "end" }
    ];
    (emit -points pts1; emit -points pts2)
      | batch :30 second:
      | remove name, type
      | view result

### Output
    { "time": "2015-03-18T00:00:00.000Z", "what": "start" }
    { "time": "2015-03-21T00:00:00.000Z", "what": "middle" }
    { "time": "2015-03-21T00:01:00.000Z", "what": "end" }

## initial historic batch ignores deprecated historic tick
(leave out actual ticks from result so test does not break when we
eventually remove historic ticks)

### Juttle
    emit -limit 2 -every :2s: -from :0:
    | filter time >= :2:
    | batch :2s:
    | view result -marks true -times true

### Output
    { "time": "1970-01-01T00:00:02.000Z", "interval": "00:00:02.000", "mark": true }
    { "time": "1970-01-01T00:00:02.000Z" }
    { "time": "1970-01-01T00:00:04.000Z", "interval": "00:00:02.000", "mark": true }

## batch includes intervals in marks

### Juttle
    emit -limit 3 -every :1s: -from :0:
    | batch -every :1s:
    | view result -marks true -times true

### Output
    { "time": "1970-01-01T00:00:00.000Z", "interval": "00:00:01.000", "mark": true }
    { "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "mark": true }
    { "time": "1970-01-01T00:00:01.000Z" }
    { "time": "1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "mark": true }
    { "time": "1970-01-01T00:00:02.000Z" }
    { "time": "1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "mark": true }
