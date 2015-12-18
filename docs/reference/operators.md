Operators
=========

Juttle supports these logical operators.

Operator   | Description
---------- | -----------
AND,and,&& |  Conjunctive operators <p>&& is [short-circuiting](https://en.wikipedia.org/wiki/Short-circuit_evaluation) while the others are not.</p>
OR,or,\|\| |  Disjunctive operators <p>\|\| is [short-circuiting](https://en.wikipedia.org/wiki/Short-circuit_evaluation) while the others are not.</p>
NOT,not,!  |  Negation operators
==         | Equality operator <p>Note `=` is also valid when used in filter expressions, but not in `if` conditionals.</p>
!=         | Inequality operator
<, <=, >, >= | Is less than, is less than or equal to, is greater than, is greater than or equal to
\~, =\~    | Matching operator for matching with "glob" expressions or regular expressions. See [matching](#Matching) below
!~         | Matching negation operator
in         | Inclusion in an array
?:         | [Ternary operator](https://en.wikipedia.org/wiki/Ternary_operation)
??         |  [Null coalescing operator](https://en.wikipedia.org/wiki/Null_coalescing_operator), a shortcut for a ternary operator with a null check


Matching
--------

The `~` or `~=` operators implement "glob" style wildcard matching or regular expression matching on a field. The matching used depends on the type of the literal being compared.

Glob matching is used when the operand is a string and supports wildcard characters `*` which matches any number of characters and `?` which matches a single character: For example:

```juttle
emit
| put message="The quick brown fox"
| filter message~"*qu?ck*"
```

Regular expression matching is performed when the operand is a literal regular expression. For example:

```juttle
emit
| put message="The quick brown fox"
| filter message~/.*[quick]+.*/
```

Short circuiting
----------------

Below are examples that illustrate the difference between
short-circuiting and non–short-circuiting behavior.

_Example: Short-circuiting_

This works because if s is null, the second condition won’t be evaluated.

```juttle
function isEmpty(s) {
  return s == null || String.length(s) == 0;
}

emit | put e = isEmpty(invalidField)
```

_Example: Non-short-circuiting_

This produces a type error because if s is null, the second condition will still be evaluated.

```juttle
function isEmpty(s) {
  return s == null OR String.length(s) == 0;
}

emit | put e = isEmpty(invalidField)
```
