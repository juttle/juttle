# Juttle "sort" processor

## Limits: non-batched flow

### Juttle

    emit -limit 10 -hz 10 | put c=count() | sort -limit 3 c | keep c | view result

### Output

    {"c":1}
    {"c":2}
    {"c":3}

## Limits: non-batched flow, point by point

### Juttle

    emit -from Date.new(0) -limit 10 -hz 10 | put c=count() | sort -limit 3 c | keep c | view result

### Output

    {"c":1}
    {"c":2}
    {"c":3}

## Limits: batched flow

### Juttle

    emit -from Date.new(0) -limit 10 -hz 10 | batch 0.5 | put c=count() | sort -limit 3 c
      | keep c | view result

### Output

    {"c":1}
    {"c":2}
    {"c":3}
    {"c":1}
    {"c":2}
    {"c":3}

## Limits: non-batched flow, point by point, by grouping

### Juttle

    emit -from Date.new(0) -limit 10 -hz 10 | put c=count(), d=c%2 | sort -limit 2 c by d | keep c, d| sort c | view result

### Output

    {"c":1,"d":1}
    {"c":2,"d":0}

## Limits: batched flow, by grouping

### Juttle

    emit -from Date.new(0) -limit 10 -hz 10 | batch 0.5 | put c=count(), d=c%2 | sort -limit 2 c by d
      | sort c | keep c, d | view result

### Output

    {"c":1,"d":1}
    {"c":2,"d":0}
    {"c":1,"d":1}
    {"c":2,"d":0}

## Timestamps: unbatched flow

### Juttle

    emit -hz 10 -limit 4 |  put a = 4 - count() | sort a | view result

### Output

    {"a":0}
    {"a":1}
    {"a":2}
    {"a":3}

## Timestamps: unbatched flow, grouping

### Juttle

    emit -hz 10 -limit 4 |  put a = 4 - count(), b=a%2 | sort a by b | view result

### Output

    {"a":1,"b":1}
    {"a":3,"b":1}
    {"a":0,"b":0}
    {"a":2,"b":0}

## Timestamps: batched flow

### Juttle

    emit -from Date.new(0) -hz 10 -limit 4 | put a = 4 - count() | batch 0.2 | sort a | view result

### Output

    {"time":"1970-01-01T00:00:00.200Z","a":2}
    {"time":"1970-01-01T00:00:00.200Z","a":3}
    {"time":"1970-01-01T00:00:00.400Z","a":0}
    {"time":"1970-01-01T00:00:00.400Z","a":1}

## Timestamps: batched flow, with grouping

### Juttle

    emit -from Date.new(0) -hz 10 -limit 4 | put a = 4 - count(), b = a%2 | batch 0.2 | sort a by b | view result

### Output

    {"time":"1970-01-01T00:00:00.200Z","a":3,"b":1}
    {"time":"1970-01-01T00:00:00.200Z","a":2,"b":0}
    {"time":"1970-01-01T00:00:00.400Z","a":1,"b":1}
    {"time":"1970-01-01T00:00:00.400Z","a":0,"b":0}

## Nested fields - arrays

### Juttle

    emit -points [
        { arr: [1, 2, 3], value: 1},
        { arr: [3, 2, 3], value: 3},
        { arr: [2, 2, 3], value: 2},
    ] | sort arr | view result

### Output

    {"arr": [1,2,3], "value": 1}
    {"arr": [2,2,3], "value": 2}
    {"arr": [3,2,3], "value": 3}

## Nested fields - array length affects sorting

### Juttle

    emit -points [
        { arr: [1], value: 1},
        { arr: [3, 2, 3], value: 3},
        { arr: [2, 2], value: 2},
    ] | sort arr | view result

### Output

    {"arr": [1], "value": 1}
    {"arr": [2,2], "value": 2}
    {"arr": [3,2,3], "value": 3}
