Head optimization
=================

Can optimize head if the adapter supports it
--------------------------------------------

### Juttle

    read test -debug 'optimization' | head 10 | view result

### Output

    { type: "head", limit: 10 }

Can optimize head with an implicit limit
--------------------------------------------

### Juttle

    read test -debug 'optimization' | head | view result

### Output

    { type: "head", limit: 1 }

Does not optimize head if the adapter doesn't support it
--------------------------------------------------------

### Juttle

    read test -debug 'optimization' -optimize false | head 10 | view result

### Output

    { type: "disabled", reason: "unsupported_optimization" }

Does not optimize head if unsupported options are passed
--------------------------------------------------------

### Juttle

    read test -debug 'optimization' | head -xyz 123 10 | view result

### Output

    { type: "disabled", reason: "unsupported_head_option" }
