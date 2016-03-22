# JuttleSpec tests

## Syntax error, partial match

### Juttle

    emit | put t= "foo" "bar" | view result

### Errors

   * SyntaxError: Expected

## Runtime error, partial match

### Juttle

    emit | join -failure true | view result

### Errors

   * CompileError: unknown

## Warning, partial match

### Juttle

    emit -limit 1 | sort foo | view result

### Warnings

   * field "foo" does not exist

## (skip) Ticks without time

### Juttle

    emit -every :1.1s: -limit 2 | remove time | view result -ticks true

### Output

    {}
    {"tick": true}
    {}

## Marks without time

### Juttle

    emit -from Date.new(0) -limit 2 | batch :s: | view result -marks true

### Output

    {"mark": true }
    {"time": "1970-01-01T00:00:00.000Z"}
    {"mark": true }
    {"time": "1970-01-01T00:00:01.000Z"}
    {"mark": true}

## Marks with time

### Juttle

    emit -from Date.new(0) -limit 2 | batch :s: | view result -marks true -times true

### Output

    {"time": "1970-01-01T00:00:00.000Z", "mark": true }
    {"time": "1970-01-01T00:00:00.000Z"}
    {"time": "1970-01-01T00:00:01.000Z", "interval": "00:00:01.000", "mark": true }
    {"time": "1970-01-01T00:00:01.000Z"}
    {"time": "1970-01-01T00:00:02.000Z", "interval": "00:00:01.000", "mark": true}

## Array/Object values

### Juttle

    emit -from Date.new(0) -limit 1 | put result = [1, 2, { "key": "value" }] | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", "result": [1, 2, { "key": "value" }] }
