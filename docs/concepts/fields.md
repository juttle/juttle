Fields
======

Each Juttle data point consists of a set of named fields. The name of a field is always a string, but the value can be of various [types](../reference/data_types.md).

:construction: This needs to be updated to clarify stream context vs function context.


Referencing
===========

Juttle includes two operators for field referencing -- the `*` operator and the `#` operator.

Consider this simple Juttle:

```juttle
emit
| put apple='fuji'
| put fruit = apple
| view text
```

The left-hand side (LHS) of this put expression is expressing "I want to
set the contents of the field called fruit to… ." This is an example of
what we call field referencing.

We could have written the above instead as:

```juttle
emit
| put apple = 'fuji'
| put *'fruit' = *'apple'
| view text
```

In this case, 'fruit' is actually a string literal, and the `*` operator
tells Juttle to affect the contents of a field with the name shown in
that string. Similarly 'apple' is also a string literal and the `*` operator tells Juttle to read from the specified field.

Alternatively, we could have omitted the quotes and written it as:

```juttle
emit
| put apple = 'fuji'
| put #fruit = #apple
| view text
```

The `#` operator functions similarly to the `*` operator except that what follows is an identifier and not a quoted string.

However, Juttle recognizes that the LHS of a put expression
always becomes a field reference, and so a bare identifier such as `fruit`
that doesn't match a const or var that is in scope is assumed to be a field
dereference and is always treated the same as if we'd typed the explicit `*'fruit'` or `#fruit.`

The use of explicit field referencing operators becomes apparent when there is a const or var with the same name as a field in scope:

```juttle
const apple='gala';
emit -limit 2
| put apple='fuji'
| (
    put fruit='apple' | view text;     // fruit will be set to 'apple'
    put fruit=apple | view text;       // fruit will be set to 'gala'
    put fruit=*'apple' | view text;    // fruit will be set to 'fuji'
    put fruit=#apple | view text;      // fruit will be set to 'fuji'
  )
```

The rules above apply to the LHS of
[put](../processors/put.md),
[reduce](../processors/reduce.md),
and
[filter](../processors/filter.md)
expressions and the RHS of put and filter expressions.

There can be other cases where explicit field referencing is
necessary. The first is within
[subgraphs](./programming_constructs.md#subgraphs)
that take field names as parameters. In this case, what's being passed
in as a parameter is just a string that is the name of the field, so the `*` operator allows access to the field of that name.

```juttle
sub cp(to, from) { put *to = *from }
emit | put apple = 'fuji' | cp -to "fruit" -from "apple" | view text
```

Another place is when the "update" function of a
[reducer](../reducers/index.md)
needs to access the contents of a field.

A handy side-effect of the explicit field referencing is that
it can allow us to work with fields whose names would not be legal as
bare identifiers.

```juttle
emit
| put *':) my favorite!' = 'honeycrisp'
| view text
```

To summarize, this is how field referencing works in Juttle:

-   On the LHS of put, reduce, and filter expressions, a bare identifier
    x is treated the same as the explicit `*'x'` or #x unless a variable `x` is in scope.
-   On the RHS of put and filter expressions, a bare identifier x is
    treated the same as the explicit `*'x'`, unless a const/variable
    named x is in scope, in which case the contents of const/variable x
    is used.
-   Inside a subgraph, or reducer "update" function, the `*` operator
    refers to the value of the field whose name follows the `*` operator,
    on the current point.
-   The `*` operator can be used with any string (literal, const,
    variable), which allows reference to a field name that would be
    invalid as a bare identifier.

Time Field
==========

The field named `time` is treated specially in the Juttle language as it is the field that is used by various processors to order points and group them into appropriate time intervals.

The time field must be a Moment (see [data types](../reference/data_types.md) that represents the time at which the event occurred. Successive points in the same stream must have time values that are monotonically increasing.
