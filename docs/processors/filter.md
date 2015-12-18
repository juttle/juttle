---
title: filter | Juttle Language Reference
---

filter 
======

Output only the points for which the given filtering expression evaluates to true.

``` 
filter filter-expression
```

The filter expression can match fields using various [operators](../reference/operators.md).

See [Filtering](../concepts/filtering.md) for more information about valid expressions to filter points. Also see [Field referencing](../concepts/fields.md#referencing) for more information about how to refer to fields in filters.

_Example: display incoming points_

This example displays all incoming points where the value for requests
is greater than 90 and host field is not server, servers, dbserver,
dbservers, webserver, or webservers. It uses metric data similar to 
[dataset 3](../examples/datasets/README.md#dataset-3).

```
{!docs/examples/processors/filter_1.juttle!}
```

_Example: Display only points containing a field named code_

This example also uses metric data similar to [dataset 3](../examples/datasets/README.md#dataset-3).

```
{!docs/examples/processors/filter_2.juttle!}
```
