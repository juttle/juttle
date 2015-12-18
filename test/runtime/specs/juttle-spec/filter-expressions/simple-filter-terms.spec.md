Simple filter terms
===================

Produces an error when used on term of invalid type
---------------------------------------------------

### Juttle

    read test [1, 2, 3]

### Errors

  * Full-text search: Invalid term type (array).

The following testcase should really be in parser tests, but we don't have
these.

Produces correct error on terms that look like options
------------------------------------------------------

### Juttle

    read test "abcd" -type "event"

### Errors

  * Options must be specified before filter expressions.
