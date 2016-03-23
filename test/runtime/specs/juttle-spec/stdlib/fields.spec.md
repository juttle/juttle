# juttle stdlib fields module

## tail returns the last N values of a field
### Juttle
    import "fields" as fields;
    emit -limit 5 -from :0:
    | put value = count()
    | reduce values=fields.tail(value, 3)
    | view result

### Output
    {values: [3,4,5]}

## tail returns the last N values for a field with only M values
### Juttle
    import "fields" as fields;
    emit -limit 2 -from :0:
    | put value = count()
    | reduce values=fields.tail(value, 3)
    | view result

### Output
    {values: [1,2]}

## tail returns the last N values of a field when there are points without that field
### Juttle
    import "fields" as fields;
    (
     emit -limit 5 -from :1:
     ;
     emit -limit 5 -from :0:
     | put value = count()
    )
    | reduce values=fields.tail(value, 3)
    | view result

### Output
    {values: [3,4,5]}

## prior returns the last nth value of a field
### Juttle
    import "fields" as fields;
    emit -limit 5 -from :0:
    | put value = count()
    | reduce value=fields.prior(value, 2)
    | view result

### Output
    {value: 4}

## prior returns the last nth value of a field when there are points without that field
### Juttle
    import "fields" as fields;
    (
     emit -limit 5 -from :1:
     ;
     emit -limit 5 -from :0:
     | put value = count()
    )
    | reduce value=fields.prior(value, 2)
    | view result

### Output
    {value: 4}

## prior returns the undef value when the last nth does not exist
### Juttle
    import "fields" as fields;
    emit -limit 5 -from :0:
    | put value = count()
    | reduce value=fields.prior(value, 6, -1)
    | view result

### Output
    {value: -1}

