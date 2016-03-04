# Field dereference operator ambiguity

Tests resolution of an ambiguity where `*` can be considered either a
multiplication operator or a field dereference operator.

## Parses toplevel `*` as multiplication with no whitespace before and no whitespace after

### Juttle

    read test -last :minute:*'name' == 'cpu'

### Errors

  * Error: Invalid operand types for "*": duration (00:01:00.000) and string (name).

## Parses toplevel `*` as multiplication with no whitespace before and whitespace after

### Juttle

    read test -last :minute:* 'name' == 'cpu'

### Errors

  * Error: Invalid operand types for "*": duration (00:01:00.000) and string (name).

## Parses toplevel `*` as field dereference with whitespace before and no whitespace after

### Juttle

    (
        read test -key "test" -last :minute: *'name' == 'cpu';
        emit -limit 1 -from Date.new(0);
    )
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }

## Parses toplevel `*` as multiplication with whitespace before and whitespace after

### Juttle

    read test -last :minute: * 'name' == 'cpu'

### Errors

  * Error: Invalid operand types for "*": duration (00:01:00.000) and string (name).
