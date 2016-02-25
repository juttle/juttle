# String literal

## Simple string

### Juttle

    emit -from Date.new(0) -limit 1 | put s = "abcd" | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", s: "abcd" }

## Interpolated string (`Null`)

### Juttle

    emit -from Date.new(0) -limit 1 | put s = "${null}" | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", s: "null" }

## Interpolated string (`Boolean`)

### Juttle

    emit -from Date.new(0) -limit 1 | put s1 = "${true}", s2 = "${false}" | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", s1: "true", s2: "false" }

## Interpolated string (`Number`)

### Juttle

    emit -from Date.new(0) -limit 1 | put s = "${5}" | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", s: "5" }

## Interpolated string (`String`)

### Juttle

    emit -from Date.new(0) -limit 1 | put s = "${"abcd"}" | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", s: "abcd" }

## Interpolated string (`RegExp`)

### Juttle

    emit -from Date.new(0) -limit 1 | put s = "${/abcd/}" | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", s: "/abcd/" }

## Interpolated string (`Date`)

### Juttle

    emit -from Date.new(0) -limit 1 | put s = "${:2015-01-01T00:00:05:}" | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", s: "2015-01-01T00:00:05.000Z" }

## Interpolated string (`Duration`)

### Juttle

    emit -from Date.new(0) -limit 1 | put s = "${:00:00:05:}" | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", s: "00:00:05.000" }

## Interpolated string (`Array`)

### Juttle

    emit -from Date.new(0) -limit 1 | put s = "${[1, 2, 3]}" | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", s: "[ 1, 2, 3 ]" }

## Interpolated string (`Object`)

### Juttle

    emit -from Date.new(0) -limit 1 | put s = "${{a: 1, b: 2, c: 3 }}" | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", s: "{ a: 1, b: 2, c: 3 }" }

## Interpolated string (complex expression)

### Juttle

    const a = 5;
    const b = 6;

    emit -from Date.new(0) -limit 1
      | put s = "${a - b} or ${b - a}"
      | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", s: "-1 or 1" }
