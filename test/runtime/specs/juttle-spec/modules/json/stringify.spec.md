The `JSON.stringify` function
=============================

Returns correct result with array
---------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
    | put array = [1, 2, 3]
    | put result = JSON.stringify(#array)
    | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", "array": [1, 2, 3], "result": "[1,2,3]" }

Returns correct result with a nested object
-------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
    | put nested = [1,2, { key: "value" }]
    | put result = JSON.stringify(#nested)
    | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", "nested": [1, 2, { "key": "value" }], "result": "[1,2,{\"key\":\"value\"}]" }

Returns correct result with a moment
------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
    | put result = JSON.stringify(#time)
    | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", "result": "\"1970-01-01T00:00:00.000Z\"" }
