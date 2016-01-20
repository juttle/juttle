Filtering
=========

In order to pare down a dataset, Juttle supports various ways of filtering the data.

[TOC]

How to Filter
-------------

There are two basic forms of filtering in Juttle.

At any point in the flowgraph, you can can use the [filter](../processors/filter.md) processor to restrict the points that will flow to those that match the given predicate. For example:

```juttle
emit -from :0: -limit 10
| put i=count(), even = (i % 2 == 0)
| filter even == true
| view table
```

Will output:

```
┌────────────────────────────────────┬──────────┬──────────┐
│ time                               │ even     │ i        │
├────────────────────────────────────┼──────────┼──────────┤
│ 1970-01-01T00:00:01.000Z           │ true     │ 2        │
├────────────────────────────────────┼──────────┼──────────┤
│ 1970-01-01T00:00:03.000Z           │ true     │ 4        │
├────────────────────────────────────┼──────────┼──────────┤
│ 1970-01-01T00:00:05.000Z           │ true     │ 6        │
├────────────────────────────────────┼──────────┼──────────┤
│ 1970-01-01T00:00:07.000Z           │ true     │ 8        │
├────────────────────────────────────┼──────────┼──────────┤
│ 1970-01-01T00:00:09.000Z           │ true     │ 10       │
└────────────────────────────────────┴──────────┴──────────┘
```

In addition, most [adapters](../adapters/index.md) take a filter expression options that are given as part of the invocation of [read](../sources/read.md) and turn that into a corresponding query (or queries) to the backend.

For example, assuming you have configured an elasticsearch adapter, then the following juttle will translate the juttle query to search for all documents with a timestamp within the last hour and a message field containing the string "error" and an app field that contains "syslog":

```juttle
read elastic -from :1 hour ago: -to :now: message~"*error*" app="syslog"
```

This could have instead been written as:

```juttle
read elastic -from :1 hour ago: -to :now: | filter message~"*error*" app="syslog"
```

While these would produce the same results, in the latter case the adapter would pull all of the documents for the last hour out of elasticsearch and into the Juttle runtime where they would be filtered, unlike the former example which sends the query to elasticsearch for execution.

Field comparisons
-----------------

The basic form of field comparisons is:

```
field operator expression
```

*or*

```
expression operator field
```

Depending on the context, you may either be able to reference fields by name or you may use the [field reference operators]('./fields.md#referencing').

The valid comparison operators include:

Operator     | Description | Examples
------------ | ----------- | --------
=, ==        | Matches exactly | `hostname = "server1"`
!=           | Does not match  | `hostname != "server-" + server_id`
<, <=, >, >= | Is less than, is less than or equal to, is greater than, is greater than or equal to                    | `cpu >= 1 + Math.max(4*20, 79)` <br> `cpu < max_cpu - 10`
~, =~      | Wildcard operator for matching with "glob" or regular expressions | True if the value of the "hostname" field is "server" followed by any number of characters: <br>`hostname ~ "server*"` <br><br>True if the value of the "hostname" field contains alphanumeric characters: <br>`hostname ~ /[A-Za-z0-9]*/`
!~           | Wildcard negation operator | True if the value of the "hostname" field does NOT begin with "server": <br>`hostname !~ "server*"`
in           | Check for inclusion in an array | True if the value of "hostname" field is one of "host1", "host2", or the value of the "server" field: <br>`hostname in ["host1", host2", server]`

See [operators reference](../reference/operators.md) for more information.



Filter Expressions
------------------

Field comparisons can be combined using the boolean operators `AND`, `OR`, and `NOT`, and can be nested using parentheses. Note that `AND` is implicitly added between two field comparison statements.

For example the following will read all points using a hypothetical adapter called `email` containing the subject "hello", where the spam rating is either 0 or 1 and the sender is not "self":

```juttle
read email subject~"*hello*" (spam=0 OR spam=1) AND NOT sender="self"
```

Full-text search
================

Juttle supports backend storage systems such as elasticsearch that implement
full-text search across all fields in a document through lexical analysis.
Full-text searches match any point in which the string returned by expression is
present in any field.

The [filter](../processors/filter.md) processor does not support full-text search -- it can only be used as part of a read from an external backend that supports search.


The search terms for full-text search are expressed using the `?=` operator followed by the search string in the filter expression for `read`. Search terms and other filter expressions can be combined with the AND, OR, NOT operators.


For example the following searches all documents in the last day for the term "alarm":

```juttle
read elastic -last :1 day: ?= "alarm"
```

And the following searches all documents in the last day containing the term "alarm" and where the `env` field is not equal to "test".

```juttle
read elastic -last :1 day: ?= 'alarm' AND NOT env = 'test'
```

### Quoted terms match exact phrases only

For example, the following matches points in which one or more fields contain the *exact phrase* "alarm failed":

```juttle
read elastic -last :1 day: ?= "alarm failed"
```

It does not match points in which one field contains "alarm" and
another field contains "failed", nor does it match points in which a
field contains "alarm has failed". To match those points, use this
instead:

```juttle
read elastic -last :1 day: ?= "alarm" ?= "failed"
```

### Terms analysis

There are many different ways in which a backend storage system may map an incoming document into terms that are available for full-text search.

From the standpoint of Juttle, the terms are passed through to the back end and the specific matching is implemented there.

### Search is not available in filter

The filter processor does not implement full-text search. It is only available when interacting with a suitable backend.
