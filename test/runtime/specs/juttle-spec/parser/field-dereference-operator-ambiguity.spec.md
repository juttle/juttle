Field dereference operator ambiguity
====================================

Tests resolution of an ambiguity where `*` can be considered either a
multiplication operator or a field dereference operator.

Parses toplevel `*` as multiplication with no whitespace before and no whitespace after
---------------------------------------------------------------------------------------

### Juttle

    read stochastic -source 'cdn' -last :minute:*'name' == 'cpu'

### Errors

  * Error: Invalid operand types for "*": duration (00:01:00.000) and string (name).

Parses toplevel `*` as multiplication with no whitespace before and whitespace after
------------------------------------------------------------------------------------

### Juttle

    read stochastic -source 'cdn' -last :minute:* 'name' == 'cpu'

### Errors

  * Error: Invalid operand types for "*": duration (00:01:00.000) and string (name).

Parses toplevel `*` as field dereference with whitespace before and no whitespace after
---------------------------------------------------------------------------------------

### Juttle

    read stochastic -source 'cdn' -last :minute: *'name' == 'cpu'
    | reduce count()
    | view result

### Output

    { count: 62 }

Parses toplevel `*` as multiplication with whitespace before and whitespace after
---------------------------------------------------------------------------------

### Juttle

    read stochastic -source 'cdn' -last :minute: * 'name' == 'cpu'

### Errors

  * Error: Invalid operand types for "*": duration (00:01:00.000) and string (name).
