Juttle "skip" processor
======================

skips a single point with no argument
---------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 4 | skip | remove time | view result

### Output
    {}
    {}
    {}

skips N points with argument
---------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 6 | skip 3 | remove time | view result

### Output
    {}
    {}
    {}

skips points by field, no argument
---------------------------------------------------

### Juttle
    emit -from Date.new(0) -limit 6
    | put id=Math.ceil(count() / 2)
    | skip by id | remove time | view result

### Output
    {id:1}
    {id:2}
    {id:3}


skips points by field, numeric argument
---------------------------------------------------

### Juttle
    emit -from Date.new(0) -limit 9
    | put id=Math.ceil(count() / 3)
    | skip 2 by id | remove time | view result

### Output
    {id:1}
    {id:2}
    {id:3}

complains about nonnumeric argument
---------------------------------------------------

### Juttle
    emit -from Date.new(0) -limit 9 | skip "foo" | view result

### Errors
  * CompileError: Error: argument for skip must be an integer
