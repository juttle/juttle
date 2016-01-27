Expression filter terms
=======================

Allows using the `*"field"` syntax
----------------------------------

Regression test for PROD-6797.

### Juttle

    emit -from Date.new(0) -limit 1 | put a = 5 | filter *"a" == 5 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", a: 5 }

Allows using the `*compile-expression` syntax
---------------------------------------------

### Juttle

    const field = "a";
    
    emit -from Date.new(0) -limit 1 | put a = 5 | filter *field == 5 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", a: 5 }

Allows using the `#field"` syntax
---------------------------------

Regression test for PROD-6797.

### Juttle

    emit -from Date.new(0) -limit 1 | put a = 5 | filter #a == 5 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", a: 5 }

The `*` operator: Produces an error when the expression has an invalid type
---------------------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put a = 5 | filter *null == 5 | view result

### Errors

  * Invalid filter term. Valid forms are: "field == value", "value == field", "field == field".

The `=~` operator: Produces an error for `non-field @ *`
--------------------------------------------------------

### Juttle

    read test 5 =~ 6

### Errors

  * Invalid filter term. Valid forms are: "field =~ string", "field =~ regexp".

The `=~` operator: Produces an error for `field @ stream-expression`
--------------------------------------------------------------------

### Juttle

    read test a =~ b + c

### Errors

  * Invalid filter term. Valid forms are: "field =~ string", "field =~ regexp".

The `!~` operator: Produces an error for `non-field @ *`
--------------------------------------------------------

### Juttle

    read test 5 !~ 6

### Errors

  * Invalid filter term. Valid forms are: "field !~ string", "field !~ regexp".

The `!~` operator: Produces an error for `field @ stream-expression`
--------------------------------------------------------------------

### Juttle

    read test a !~ b + c

### Errors

  * Invalid filter term. Valid forms are: "field !~ string", "field !~ regexp".

Other operators: Produces an error for `non-field @ non-field`
--------------------------------------------------------------

### Juttle

    read test 5 < 6

### Errors

  * Invalid filter term. Valid forms are: "field < value", "value < field".

Other operators: Produces an error for `field @ stream-expression`
------------------------------------------------------------------

### Juttle

    read test a < b + c

### Errors

  * Invalid filter term. Valid forms are: "field < value", "value < field".

Other operators: Produces an error for `stream-expression @ field`
------------------------------------------------------------------

### Juttle

    read test a + b < c

### Errors

  * Invalid filter term. Valid forms are: "field < value", "value < field".

Other operators: Allows `field @ field` in `filter`
---------------------------------------------------

### Juttle

    emit -from :0: -limit 1
    | put a = 5, b = 6
    | filter a < b
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", a: 5, b: 6 }

Other operators: Produces an error for `field @ field` in `read`
----------------------------------------------------------------

### Juttle

    read test a < b

### Errors

  * Invalid filter term. Valid forms are: "field < value", "value < field".

The `=~` operator: Produces an error when RHS has an invalid type
-----------------------------------------------------------------

### Juttle

    read test a =~ [1, 2, 3]

### Errors

  * Invalid filter term. Valid forms are: "field =~ string", "field =~ regexp".

The `=~` operator: Returns `false` when LHS is a non-string value
-----------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 5
      | put a = count() % 2 == 1 ? "abcd" : null
      | filter a =~ "abcd"
      | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", a: "abcd" }
    { time: "1970-01-01T00:00:02.000Z", a: "abcd" }
    { time: "1970-01-01T00:00:04.000Z", a: "abcd" }

The `!~` operator: Produces an error when RHS has an invalid type
-----------------------------------------------------------------

### Juttle

    read test a !~ [1, 2, 3]

### Errors

  * Invalid filter term. Valid forms are: "field !~ string", "field !~ regexp".

The `!~` operator: Returns `true` when LHS is a non-string value
----------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 5
      | put a = count() % 2 == 1 ? "abcd" : null
      | filter a !~ "efgh"
      | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", a: "abcd" }
    { time: "1970-01-01T00:00:01.000Z", a: null }
    { time: "1970-01-01T00:00:02.000Z", a: "abcd" }
    { time: "1970-01-01T00:00:03.000Z", a: null }
    { time: "1970-01-01T00:00:04.000Z", a: "abcd" }

The `in` operator: Produces an error when used on operand of invalid type
-------------------------------------------------------------------------

### Juttle

    read test a in "abcd"

### Errors

  * Invalid filter term. Valid forms are: "field in array".

Other operators: Produces an error when used on operand of invalid type
-----------------------------------------------------------------------

### Juttle

    read test a == [1, 2, 3]

### Errors

  * Invalid filter term. Valid forms are: "field == value", "value == field".
