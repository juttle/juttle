# Juttle "count_unique" reducer

## complains if missing argument

### Juttle

    reduce count_unique() | view result

### Errors

   * reducer count_unique expects 1 argument but was called with 0


## counts unique days
### Juttle
    emit -limit 100 -every :hour: -from Date.new(0)
    | put day = Date.startOf(time,"day")
    | reduce days=count_unique(day)
    | view result

### Output
    { days: 5 }

## supports nested points
### Juttle
    emit -points [ {"task":{"day":"Monday"}}, {"task":{"day":"Friday"}}, {"task":{"day":"Monday"}} ]
    | reduce days = count_unique(task)
    | view result

### Output
    { days: 2 }
