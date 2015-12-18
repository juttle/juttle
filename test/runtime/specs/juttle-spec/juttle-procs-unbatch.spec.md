Juttle unbatch command
======================

unbatch with an argument complains
----------------------------------

### Juttle
    emit -from :2015-01-1: -limit 2 | unbatch -every :minute: | view result

### Errors
   * SyntaxError


unbatch unbatches
-----------------

### Juttle
    emit -from :2015-01-01: -limit 20
      | batch :5s: | reduce count()
      | unbatch | reduce count()
      | view result

### Output
    { "count": 4 }
