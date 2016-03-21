# Juttle reduce processor, windowed -over mode
These tests give -over a workout. -over specifies a window of time
over which each reducer computation should operate (all points within
that window). Partial windows (at the beginning or end of a stream)
do not trigger reducer runs. `reduce -every -over` and `batch | reduce -over`
produce the same results except for their handling of partial
batches at beginning/end of stream. To make them behave exactly
the same, in the unbatched reduce specify -from/-to equal to the beginning
and ending epochs of the data (the batched reducer is fed these epochs as
marks by the upstream batch, so they needn't be specified for batched operation)

## complains if -over is not a duration
### Juttle

    reduce -every :s: -over 0.01 count() |  view result

### Errors

   * -over wants a duration, got 0.01

## put with -over works
### Juttle

    emit -from Date.new(0) -limit 6 | put -over :3s: c = count() | view result

### Output

    {"time": "1970-01-01T00:00:00.000Z", "c": 1}
    {"time": "1970-01-01T00:00:01.000Z", "c": 2}
    {"time": "1970-01-01T00:00:02.000Z", "c": 3}
    {"time": "1970-01-01T00:00:03.000Z", "c": 3}
    {"time": "1970-01-01T00:00:04.000Z", "c": 3}
    {"time": "1970-01-01T00:00:05.000Z", "c": 3}

## put with -over and -from works
### Juttle

    emit -from Date.new(0) -limit 6 | put -from Date.new(0) -over :3s: c = count() | view result

### Output

    {"time": "1970-01-01T00:00:00.000Z"}
    {"time": "1970-01-01T00:00:01.000Z"}
    {"time": "1970-01-01T00:00:02.000Z"}
    {"time": "1970-01-01T00:00:03.000Z", "c": 3}
    {"time": "1970-01-01T00:00:04.000Z", "c": 3}
    {"time": "1970-01-01T00:00:05.000Z", "c": 3}

## put with -over -by works
### Juttle

    emit -points [
        {"time": "1970-01-01T00:00:01.000Z", "color":"red"},
        {"time": "1970-01-01T00:00:02.000Z", "color":"blue"},
        {"time": "1970-01-01T00:00:03.000Z", "color":"red"},
        {"time": "1970-01-01T00:00:04.000Z", "color":"blue"},
        {"time": "1970-01-01T00:00:05.000Z", "color":"red"},
        {"time": "1970-01-01T00:00:06.000Z", "color":"blue"}
    ]
    | put -over :6s: c = count() by color
    | keep time, color, c
    | view result

### Output

    { "time": "1970-01-01T00:00:01.000Z",
      "color": "red", "c": 1 }
    { "time": "1970-01-01T00:00:02.000Z",
      "color": "blue", "c": 1 }
    { "time": "1970-01-01T00:00:03.000Z",
      "color": "red", "c": 2 }
    { "time": "1970-01-01T00:00:04.000Z",
      "color": "blue", "c": 2 }
    { "time": "1970-01-01T00:00:05.000Z",
      "color": "red", "c": 3 }
    { "time": "1970-01-01T00:00:06.000Z",
      "color": "blue", "c": 3 }

## put with -over trumps batches (they are just not relevant) but forwards them
specifying -over specifies reset behavior as well, and we've decided
this should trump any batch present.
### Juttle

    emit -from Date.new(0) -limit 6
    | batch :2s:
    | put -over :3s: over = count()
    | put under = count()
    | view result

### Output

    {"time": "1970-01-01T00:00:00.000Z", "over": 1, "under": 1 }
    {"time": "1970-01-01T00:00:01.000Z", "over": 2, "under": 2 }
    {"time": "1970-01-01T00:00:02.000Z", "over": 3, "under": 1 }
    {"time": "1970-01-01T00:00:03.000Z", "over": 3, "under": 2 }
    {"time": "1970-01-01T00:00:04.000Z", "over": 3, "under": 1 }
    {"time": "1970-01-01T00:00:05.000Z", "over": 3, "under": 2 }

## put with -over downstream from a reduce works
### Juttle

    emit -from Date.new(0) -limit 6
    | batch :2s:
    | reduce count()
    | put -over :4s: sum=sum(count), over=count()
    | view result

### Output

    {
      "time": "1970-01-01T00:00:02.000Z",
      "interval": "00:00:02.000",
      "count": 2,
      "sum": 2,
      "over": 1
    }
    {
      "time": "1970-01-01T00:00:04.000Z",
      "interval": "00:00:02.000",
      "count": 2,
      "sum": 4,
      "over": 2
    }
    {
      "time": "1970-01-01T00:00:06.000Z",
      "interval": "00:00:02.000",
      "count": 2,
      "sum": 4,
      "over": 2
    }

## one-shot reduce with -over works
### Juttle

    emit -from Date.new(0) -limit 6
    | reduce -over :3s: over = count()
    | view result

### Output

    { "over": 3 }

## batch-driven reduce with -over same as batch
### Juttle

    emit -from Date.new(0) -limit 6
    | batch :3s:
    | reduce -over :3s: over = count()
    | view result

### Output
    { "time": "1970-01-01T00:00:03.000Z", "interval": "00:00:03.000", "over": 3}
    { "time": "1970-01-01T00:00:06.000Z", "interval": "00:00:03.000", "over": 3}

## batch-driven reduce with -over less than batch works
### Juttle

    emit -from Date.new(0) -limit 8
    | batch :4s:
    | reduce -over :3s: over = count()
    | view result

### Output
    { "time": "1970-01-01T00:00:04.000Z", "interval": "00:00:04.000", "over": 3}
    { "time": "1970-01-01T00:00:08.000Z", "interval": "00:00:04.000", "over": 3}

## batch-driven reduce with -over greater than batch works
### Juttle

    emit -from Date.new(0) -limit 9
    | batch :3s:
    | reduce -over :4s: over = count()
    | view result

### Output
    { "time": "1970-01-01T00:00:03.000Z", "interval": "00:00:03.000", "over": 3}
    { "time": "1970-01-01T00:00:06.000Z", "interval": "00:00:03.000", "over": 4}
    { "time": "1970-01-01T00:00:09.000Z", "interval": "00:00:03.000", "over": 4}

## batch-driven reduce with -over downstream from a reduce works
### Juttle

    emit -from Date.new(0) -limit 6
    | batch :3s:
    | reduce count()
    | reduce -over :3s: over = count()
    | view result

### Output
    { "time": "1970-01-01T00:00:03.000Z", "interval": "00:00:03.000", "over": 1}
    { "time": "1970-01-01T00:00:06.000Z", "interval": "00:00:03.000", "over": 1}

## every-driven reduce with -over === -every is same as batch reduce
### Juttle

    emit -from Date.new(0) -limit 6
    | reduce -to :1970-01-01T00:00:06.000Z: -every :3s: -over :3s: over = count()
    | view result

### Output
    { "time": "1970-01-01T00:00:03.000Z", "interval": "00:00:03.000", "over": 3}
    { "time": "1970-01-01T00:00:06.000Z", "interval": "00:00:03.000", "over": 3}


## every-driven reduce with -over less than -every works
### Juttle

    emit -from Date.new(0) -limit 6
    | reduce -to :1970-01-01T00:00:06.000Z: -every :3s: -over :2s: over = count()
    | view result

### Output
    { "time": "1970-01-01T00:00:03.000Z", "interval": "00:00:03.000", "over": 2}
    { "time": "1970-01-01T00:00:06.000Z", "interval": "00:00:03.000", "over": 2}

## every-driven reduce with -over greater than -every works
### Juttle

    emit -from Date.new(0) -limit 6
    | reduce -to :1970-01-01T00:00:06.000Z: -every :3s: -over :4s: over = count()
    | view result

### Output
    { "time": "1970-01-01T00:00:03.000Z", "interval": "00:00:03.000", "over": 3}
    { "time": "1970-01-01T00:00:06.000Z", "interval": "00:00:03.000", "over": 4}

## cascade of every-driven reducers, first
### Juttle

    emit -from Date.new(0) -limit 3
    | reduce -to :1970-01-01T00:00:03.000Z: -every :s: -over :s: first1=first(time)
    | reduce -to :1970-01-01T00:00:03.000Z: -every :s: -over :s: first2=first(first1)
    | reduce -to :1970-01-01T00:00:03.000Z: -every :s: -over :s: first3=first(first2)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "first3":"1970-01-01T00:00:00.000Z"}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "first3":"1970-01-01T00:00:01.000Z"}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "first3":"1970-01-01T00:00:02.000Z"}

## cascade of every-driven reducers, last
### Juttle

    emit -from Date.new(0) -limit 3
    | reduce -to :1970-01-01T00:00:03.000Z: -every :s: -over :s: last1=last(time)
    | reduce -to :1970-01-01T00:00:03.000Z: -every :s: -over :s: last2=last(last1)
    | reduce -to :1970-01-01T00:00:03.000Z: -every :s: -over :s: last3=last(last2)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "last3":"1970-01-01T00:00:00.000Z"}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "last3":"1970-01-01T00:00:01.000Z"}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "last3":"1970-01-01T00:00:02.000Z"}

## cascade of batch-driven reducers, first
### Juttle

    emit -from Date.new(0) -limit 3
    | batch :1s:
    | reduce -over :s: first1=first(time)
    | reduce -over :s: first2=first(first1)
    | reduce -over :s: first3=first(first2)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "first3":"1970-01-01T00:00:00.000Z"}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "first3":"1970-01-01T00:00:01.000Z"}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "first3":"1970-01-01T00:00:02.000Z"}

## cascade of batch-driven reducers, last
### Juttle

    emit -from Date.new(0) -limit 3
    | batch :1s:
    | reduce -to :1970-01-01T00:00:03.000Z: -over :s: last1=last(time)
    | reduce -to :1970-01-01T00:00:03.000Z: -over :s: last2=last(last1)
    | reduce -to :1970-01-01T00:00:03.000Z: -over :s: last3=last(last2)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "last3":"1970-01-01T00:00:00.000Z"}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "last3":"1970-01-01T00:00:01.000Z"}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "last3":"1970-01-01T00:00:02.000Z"}

## every-driven reduce with -every faster than data and -over longer

### Juttle

    emit -from Date.new(0) -limit 5 -every :3s:
    | reduce -every :1s: -over :4s: over = count()
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:04.000Z", "interval": "00:00:01.000", "over":2}
    {"time":"1970-01-01T00:00:05.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:06.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:07.000Z", "interval": "00:00:01.000", "over":2}
    {"time":"1970-01-01T00:00:08.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:09.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:10.000Z", "interval": "00:00:01.000", "over":2}
    {"time":"1970-01-01T00:00:11.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:12.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:13.000Z", "interval": "00:00:01.000", "over":2}

## reduce -every with -from/-to and no -over complains

### Juttle

    emit  -every :hour: -from Date.new(0) -limit 48
    | reduce -from Date.new(0) -every :day: -on :12:00:00: hours=count()
    | view result

### Errors

   * only when -over is specified


## batch reduce with -from/-to and no -over complains

### Juttle

    emit  -every :hour: -from Date.new(0) -limit 48
    | batch -every :day: -on :12:00:00:
    | reduce -from Date.new(0) hours=count()
    | view result

### Errors

   * only when -over is specified


## reduce -every with leading partial window result suppressed using -from

### Juttle

    emit  -every :hour: -from Date.new(0) -limit 48
    | reduce -from Date.new(0) -to :1970-01-03T12:00:00.000Z: -every :day: -over :day: -on :12:00:00: hours=count()
    | view result

### Output
    { "hours": 24,
      "time": "1970-01-02T12:00:00.000Z",
      "interval": "1d"
    }
    { "hours": 12,
      "time": "1970-01-03T12:00:00.000Z",
      "interval": "1d"
    }

## reduce -every with trailing partial window result suppressed using -to

### Juttle

    emit  -every :hour: -from Date.new(0) -limit 48
    | reduce -to Date.new(48*3600) -every :day: -over :day: -on :12:00:00:   hours=count()
    | view result

### Output
    { "hours": 12,
      "time": "1970-01-01T12:00:00.000Z",
      "interval": "1d"
    }
    { "hours": 24,
      "time": "1970-01-02T12:00:00.000Z",
      "interval": "1d"
    }

## batch reduce with leading partial window result suppressed using -from

### Juttle

    emit  -every :hour: -from Date.new(0) -limit 48
    | batch -every :day: -on :12:00:00:
    | reduce -from Date.new(0) -over :day: hours=count()
    | view result

### Output
    { "hours": 24,
      "time": "1970-01-02T12:00:00.000Z",
      "interval": "1d"
    }
    { "hours": 12,
      "time": "1970-01-03T12:00:00.000Z",
      "interval": "1d"
    }

## batch reduce with trailing partial window result suppressed using -to

### Juttle

    emit  -every :hour: -from Date.new(0) -limit 48
    | batch -every :day: -on :12:00:00:
    | reduce -to Date.new(48*3600) -over :day: hours=count()
    | view result

### Output
    { "hours": 12,
      "time": "1970-01-01T12:00:00.000Z",
      "interval": "1d"
    }
    { "hours": 24,
      "time": "1970-01-02T12:00:00.000Z",
      "interval": "1d"
    }

## reduce -every with -over, long partial windows suppressed using -to and -from

### Juttle

    emit  -every :hour: -from Date.new(0) -limit 96
    | reduce -from Date.new(0) -to Date.new(96*3600) -every :day: -on :12:00:00:  -over :2days: hours=count()
    | view result

### Output
    {"hours": 48, "time": "1970-01-03T12:00:00.000Z", "interval": "1d"}
    {"hours": 48, "time": "1970-01-04T12:00:00.000Z", "interval": "1d"}

## batch reduce with -over, long partial windows suppressed using -to and -from

### Juttle

    emit  -every :hour: -from Date.new(0) -limit 96
    | batch -every :day: -on :12:00:00:
    | reduce -from Date.new(0) -to Date.new(96*3600) -over :2days: hours=count()
    | view result

### Output
    {"hours": 48, "time": "1970-01-03T12:00:00.000Z", "interval": "1d"}
    {"hours": 48, "time": "1970-01-04T12:00:00.000Z", "interval": "1d"}

## every-driven reduce with -every faster than data and -over longer, ragged windows suppressed

### Juttle

    emit -from Date.new(0) -limit 5 -every :3s:
    | reduce -from Date.new(0) -to Date.new(3*5) -every :1s: -over :4s: over = count()
    | view result

### Output

    {"time":"1970-01-01T00:00:04.000Z", "interval": "00:00:01.000", "over":2}
    {"time":"1970-01-01T00:00:05.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:06.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:07.000Z", "interval": "00:00:01.000", "over":2}
    {"time":"1970-01-01T00:00:08.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:09.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:10.000Z", "interval": "00:00:01.000", "over":2}
    {"time":"1970-01-01T00:00:11.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:12.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:13.000Z", "interval": "00:00:01.000", "over":2}

## every-driven reduce is aligned with its start time, not the epoch
### Juttle

    emit -every :1s: -from :-3s: -to :+1.1s:
    | reduce -over :3s: -every :1s: -from :-3s: -to :now: N=count()
    | keep N
    | view result

### Output

    { "N": 3 }

## (skip)PROD-7471 every-driven reduce triggers an advance on ticks outside the window, ahead of eof
XXX when PROD-7331 merges, make this test fast.

### Juttle
    emit -every :2s: -from :3s before this second: -to :5 seconds after this second:
    | filter time < :now:
    | reduce -over :3s: -every :3s: -from :-3s: -to :now: N=count()
    | keep N
    | view result -ticks true

### Output
    {"tick": true}
    {"N": 1}
    {"tick": true}

## (skip)PROD-7471 one-shot reduce -over/-to triggers an advance on ticks outside the window, ahead of eof
XXX when PROD-7331 merges, make this test fast.

### Juttle
    emit -every :2s: -from :3s before this second: -to :5 seconds after this second:
    | filter time < :now:
    | reduce -over :3s: -to :now: N=count()
    | keep N
    | view result -ticks true

### Output
    {"tick": true}
    {"N": 1}
    {"tick": true}

## every-driven reduce triggers an advance on data outside the window, ahead of eof
XXX when PROD-7331 merges, make this test fast.

### Juttle
    emit -every :1s: -from :3s before this second: -to :5 seconds after this second:
    | filter time < :+2s:
    | reduce -over :3s: -every :3s: -from :-3s: -to :now: N=count()
    | put delay = Date.time() - time, winning = delay < :2s:
    | keep winning
    | view result

### Output
    { "winning":true }

## one-shot reduce -over/-to triggers an advance on data outside the window, ahead of eof
XXX when PROD-7331 merges, make this test fast.

### Juttle
    emit -every :1s: -from :3s before this second: -to :5 seconds after this second:
    | filter time < :+2s:
    | reduce -over :3s: -to :now: N=count()
    | put delay = Date.time() - time, winning = delay < :2s:
    | keep winning
    | view result

### Output
    { "winning":true }

## windowed count works (custom expire method)
### Juttle

    emit -from Date.new(0) -limit 6
    | reduce -over :3s: over = count()
    | view result

### Output

    { "over": 3 }

## windowed avg works (custom expire method)
### Juttle

    emit -from Date.new(0) -limit 4
    | put dt = Date.unix(time)
    | reduce -every :s: -over :3s: -to :1970-01-01T00:00:04.000Z: over = avg(dt)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "over":0}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "over":0.5}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:04.000Z", "interval": "00:00:01.000", "over":2}

## windowed sum works (custom expire method)
### Juttle

    emit -from Date.new(0) -limit 4
    | put dt = Date.unix(time)
    | reduce -every :s: -over :3s: -to :1970-01-01T00:00:04.000Z: over = sum(dt)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "over":0}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "over":3}
    {"time":"1970-01-01T00:00:04.000Z", "interval": "00:00:01.000", "over":6}

## windowed stdev works (custom expire method)
### Juttle

    emit -from Date.new(0) -limit 4
    | put dt = Date.unix(time)
    | reduce -every :s: -over :3s: -to :1970-01-01T00:00:04.000Z: over = stdev(dt)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "over":0}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "over":0.5}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "over":0.816496580927726}
    {"time":"1970-01-01T00:00:04.000Z", "interval": "00:00:01.000", "over":0.816496580927726}

## windowed min works
### Juttle

    emit -from Date.new(0) -limit 4
    | put dt = Date.unix(time)
    | reduce -every :s: -over :3s: -to :1970-01-01T00:00:04.000Z: over = min(dt)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "over":0}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "over":0}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "over":0}
    {"time":"1970-01-01T00:00:04.000Z", "interval": "00:00:01.000", "over":1}

## windowed max works
### Juttle

    emit -from Date.new(0) -limit 4
    | put dt = Date.unix(time)
    | reduce -every :s: -over :3s: -to :1970-01-01T00:00:04.000Z: over = max(dt)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "over":0}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "over":2}
    {"time":"1970-01-01T00:00:04.000Z", "interval": "00:00:01.000", "over":3}

## windowed first works
### Juttle

    emit -from Date.new(0) -limit 4
    | put dt = Date.unix(time)
    | reduce -every :s: -over :3s: -to :1970-01-01T00:00:04.000Z: over = first(dt)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "over":0}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "over":0}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "over":0}
    {"time":"1970-01-01T00:00:04.000Z", "interval": "00:00:01.000", "over":1}

## windowed last works
### Juttle

    emit -from Date.new(0) -limit 4
    | put dt = Date.unix(time)
    | reduce -every :s: -over :3s: -to :1970-01-01T00:00:04.000Z: over = last(dt)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "over":0}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "over":1}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "over":2}
    {"time":"1970-01-01T00:00:04.000Z", "interval": "00:00:01.000", "over":3}

## windowed pluck works
### Juttle

    emit -from Date.new(0) -limit 6
    | put dt = Date.unix(time)
    | reduce -every :s: -over :3s: -to :1970-01-01T00:00:06.000Z: over = pluck(dt)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "over":[0]}
    {"time":"1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "over":[0,1]}
    {"time":"1970-01-01T00:00:03.000Z", "interval": "00:00:01.000", "over":[0,1,2]}
    {"time":"1970-01-01T00:00:04.000Z", "interval": "00:00:01.000", "over":[1,2,3]}
    {"time":"1970-01-01T00:00:05.000Z", "interval": "00:00:01.000", "over":[2,3,4]}
    {"time":"1970-01-01T00:00:06.000Z", "interval": "00:00:01.000", "over":[3,4,5]}

## windowed percentile works
(consult pluck output to convince yourself)

### Juttle

    emit -from Date.new(0) -limit 6
    | put dt = Date.unix(time)
    | reduce -every :s: -over :3s: -to :1970-01-01T00:00:06.000Z: over = percentile(dt)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z","over":0, "interval": "00:00:01.000"}
    {"time":"1970-01-01T00:00:02.000Z","over":0, "interval": "00:00:01.000"}
    {"time":"1970-01-01T00:00:03.000Z","over":1, "interval": "00:00:01.000"}
    {"time":"1970-01-01T00:00:04.000Z","over":2, "interval": "00:00:01.000"}
    {"time":"1970-01-01T00:00:05.000Z","over":3, "interval": "00:00:01.000"}
    {"time":"1970-01-01T00:00:06.000Z","over":4, "interval": "00:00:01.000"}

## windowed count_unique works

### Juttle

    emit -from Date.new(0) -limit 6
    | put dt = Date.unix(time) % 2
    | reduce -to :1970-01-01T00:00:06.000Z: -every :s: -over :3s: over = count_unique(dt)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z","over":1, "interval": "00:00:01.000"}
    {"time":"1970-01-01T00:00:02.000Z","over":2, "interval": "00:00:01.000"}
    {"time":"1970-01-01T00:00:03.000Z","over":2, "interval": "00:00:01.000"}
    {"time":"1970-01-01T00:00:04.000Z","over":2, "interval": "00:00:01.000"}
    {"time":"1970-01-01T00:00:05.000Z","over":2, "interval": "00:00:01.000"}
    {"time":"1970-01-01T00:00:06.000Z","over":2, "interval": "00:00:01.000"}

## custom windowed reducers work with expire
### Juttle

    reducer count_odd(fieldname) {
        var count = 0;

        function update() {
            if (*fieldname % 2 != 0) {
                count = count + 1;
            }
        }
        function expire() {
            if (*fieldname % 2 != 0) {
                count = count - 1;
            }
        }
        function result() {
            return count;
        }
    }
    emit -limit 6 -from Date.new(0)
    | put c=count()
    | put -over :4s: nodd=count_odd(c)
    | view result

### Output

    {
      "time": "1970-01-01T00:00:00.000Z",
      "c": 1,
      "nodd": 1
    }
    {
      "time": "1970-01-01T00:00:01.000Z",
      "c": 2,
      "nodd": 1
    }
    {
      "time": "1970-01-01T00:00:02.000Z",
      "c": 3,
      "nodd": 2
    }
    {
      "time": "1970-01-01T00:00:03.000Z",
      "c": 4,
      "nodd": 2
    }
    {
      "time": "1970-01-01T00:00:04.000Z",
      "c": 5,
      "nodd": 2
    }
    {
      "time": "1970-01-01T00:00:05.000Z",
      "c": 6,
      "nodd": 2
    }

## custom windowed reducers work without expire
### Juttle

    reducer count_odd(fieldname) {
        var count = 0;

        function update() {
            if (*fieldname % 2 != 0) {
                count = count + 1;
            }
        }
        function result() {
            return count;
        }
    }
    emit -limit 6 -from Date.new(0)
    | put c=count()
    | put -over :4s: nodd=count_odd(c)
    | view result

### Output

    {
      "time": "1970-01-01T00:00:00.000Z",
      "c": 1,
      "nodd": 1
    }
    {
      "time": "1970-01-01T00:00:01.000Z",
      "c": 2,
      "nodd": 1
    }
    {
      "time": "1970-01-01T00:00:02.000Z",
      "c": 3,
      "nodd": 2
    }
    {
      "time": "1970-01-01T00:00:03.000Z",
      "c": 4,
      "nodd": 2
    }
    {
      "time": "1970-01-01T00:00:04.000Z",
      "c": 5,
      "nodd": 2
    }
    {
      "time": "1970-01-01T00:00:05.000Z",
      "c": 6,
      "nodd": 2
    }
