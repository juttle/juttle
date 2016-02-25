# juttle stdlib.predict module

## predict with features disabled returns previous value
### Juttle
    import "predict.juttle" as predict;
    emit -limit 5 -from Date.new(0) -every :d:
    | put value = count()
    | predict.predict -over :w: -every :d: -detrend false -deseason false -denoise false -revise false
    | keep time, value, P, E
    | view result

### Output
    { time: "1970-01-01T00:00:00.000Z", value: 1, P: 0, E: -1 }
    { time: "1970-01-02T00:00:00.000Z", value: 2, P: 1, E: -1 }
    { time: "1970-01-03T00:00:00.000Z", value: 3, P: 2, E: -1 }
    { time: "1970-01-04T00:00:00.000Z", value: 4, P: 3, E: -1 }
    { time: "1970-01-05T00:00:00.000Z", value: 5, P: 4, E: -1 }

## predict can detrend a straight line
### Juttle
    import "predict.juttle" as predict;
    emit -limit 14 -from Date.new(0) -every :d:
    | put value = count()
    | predict.predict -over :w: -every :d: -deseason false
    | reduce value=last(value), P=last(P)
    | view result

### Output
    { value: 14, P: 14 }

## predict can deseasonalize a sinewave
### Juttle
    import "predict.juttle" as predict;
    const every=:d:;
    const over=:w:;
    emit -from Date.new(0) -to Date.new(0)+4*over -every every
    | put dy = (time - Date.new(0)) / over, cycle = Math.sin(dy * 2 * Math.PI)
    | put value = 10 * cycle
    | predict.predict -over over -every every -nonneg false
    | reduce value=last(value), P=last(P)
    | view result

### Output
    { value: -7.818314824680304, P: -7.818314824680301 }

## predict can detrend and deseasonalize
### Juttle
    import "predict.juttle" as predict;
    const every=:d:;
    const over=:w:;
    emit -from Date.new(0) -to Date.new(0)+4*over -every every
    | put n = count(), dy = (time - Date.new(0)) / over, cycle = Math.sin(dy * 2 * Math.PI)
    | put value = n  + 10 * cycle
    | predict.predict -over over -every every
    | reduce value=last(value), P=last(P)
    | view result

### Output
    { value: 20.181685175319696, P: 20.181685175319696 }
