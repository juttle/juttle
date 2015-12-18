---
title: text | Juttle Language Reference
---

text
======

Display a raw dump of the output, optionally as JSON or CSV.

```
view text -o {
   format: 'raw|json|jsonl|csv',
   limit: n,
   indent: n
}
```

*or*
```
view text
  -format 'raw|json|jsonl|csv'
  -limit n
  -indent n
```

See [Defining view parameters](../sinks/view.md#defining-view-parameters) for an explanation of how sink parameters can be expressed as object literals.

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-format`  |  You can set this to 'csv', 'json', or 'jsonl' to get CSV or pretty-printed JSON / JSON Lines: output, respectively. Batch delimiters are ignored when 'json', 'jsonl', or 'csv' is specified. The 'indent' is ignored unless 'json' is specified. |  No; default is 'json'
`-limit`  |  The maximum number of data points to display  |  No; default is complete output of the flowgraph
`-indent` |  An optional number specifying indentation size for pretty-printed JSON output  |  No; defaults to JSON with one data point per line

_Example: view raw output_

```
{!docs/examples/sinks/text_raw.juttle!}
```

```raw
{"time":"2015-12-17T17:41:09.193Z","value":378}
{"time":"2015-12-17T17:41:09.293Z","value":414}
{"time":"2015-12-17T17:41:09.393Z","value":301}
{"time":"2015-12-17T17:41:09.493Z","value":855}
{"time":"2015-12-17T17:41:09.593Z","value":508}
==============================================================
```

_Example: view CSV_

```
{!docs/examples/sinks/text_csv.juttle!}
```

```csv
"time","value"
"2015-12-17T17:41:52.326Z","870"
"2015-12-17T17:41:53.326Z","12"
"2015-12-17T17:41:54.326Z","332"
"2015-12-17T17:41:55.326Z","453"
"2015-12-17T17:41:56.326Z","581"
```

_Example: view JSON_

```
{!docs/examples/sinks/text_json.juttle!}
```

```json
[
{"time":"2015-12-17T17:42:29.677Z","value":223},
{"time":"2015-12-17T17:42:29.777Z","value":341},
{"time":"2015-12-17T17:42:29.877Z","value":331},
{"time":"2015-12-17T17:42:29.977Z","value":787},
{"time":"2015-12-17T17:42:30.077Z","value":625}
]
```
