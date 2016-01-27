---
title: File Adapter | Juttle Language Reference
---

# File Adapter

The `file` adapter allows reading points from, or writing points to, a file on the local filesystem.

[TOC]

## read file

Supported file formats are JSON array, and JSON lines; see examples below.

```text
read file -file <path> [-format <format>] [-timeField <fieldname>]
```

Parameter         |             Description          | Required?
----------------- | -------------------------------- | ---------:
`-file`           | File path on the local filesystem, absolute or relative to the current working directory  | Yes
`-format`         | Input file format, supports: `csv`, `json`, `jsonl`, or `grok` for text [parseable by grok](parsers/index.md) | No; defaults to `json`
`-timeField`      | Name of the field in the data which contains a valid timestamp  | No; defaults to `time`
`-pattern`        | When `-format='grok'` you can specify the grok matching pattern here. More information on grok [here](parsers/grok.md)  | No

The data is assumed to contain valid timestamps in a field named `time` by default; a different name for the time field may be specified with `-timeField` option. If the data contains fields `time` and another named field specified with `-timeField`, the original contents of field `time` will be overwritten by the valid timestamp from `timeField`. 

Timeless data, which contains no timestamps, is acceptable; however certain operations which expect time to be present in the points, such as `reduce -every :interval:`, will execute with warnings or error out. Timeless data can be joined in the Juttle flowgraph with other data which contains timestamps; a common use case for reading timeless data from a file or another backend is to join it with streaming data for enrichment.

The file adapter does not support any kind of filtering (neither filter expressions, nor full text search). In order to filter the data read from file, pipe to the [filter](../processors/filter.md) proc.

_Example: read from a JSON array data file_

The source file has data in JSON array format:

```
{!docs/examples/datasets/input1.json!}
```

This program reads the file in, and filters on a specific hostname:

```juttle
read file -file 'docs/examples/datasets/input1.json'
| filter hostname = 'lemoncake'
| view table
```

_Example: read from a JSON lines data file_

The source file has data in JSON lines format, i.e. newline separated JSON objects:

```
{!docs/examples/datasets/json_lines.jsonl!}
```

This program reads the file in, and filters on a specific hostname:

```juttle
read file -file 'docs/examples/datasets/json_lines.jsonl'
| filter hostname = 'lemoncake'
| view table
```

The above examples produce the same output table:

```
┌────────────────────────────────────┬──────────────┬──────────┐
│ time                               │ hostname     │ state    │
├────────────────────────────────────┼──────────────┼──────────┤
│ 2015-11-06T04:28:32.304Z           │ lemoncake    │ ok       │
├────────────────────────────────────┼──────────────┼──────────┤
│ 2015-11-06T04:28:42.405Z           │ lemoncake    │ ok       │
└────────────────────────────────────┴──────────────┴──────────┘
```

## write file

Data is written out to a file as a JSON array; no other output formats are supported.

```text
write file -file <path>
```

Parameter         |             Description          | Required?
----------------- | -------------------------------- | ---------:
`-file`           | File path on the local filesystem, absolute or relative to the current working directory  | Yes
`-bufferLimit`    | Maximum number of points that will be written to the file. | No; defaults to 100
`-append`         | When set to true your JSON data is append to an existing file otherwise the file is truncated and data from the current program is written out | No; defaults to false

If the file already exists and contains a valid JSON array, the write will append new data rather than overwrite.

_Example: writing data to a file_

```juttle
emit -from :2015-01-01: -limit 2 
| put name = 'write_me', value = count() 
| write file -file '/tmp/write_me.json'
```

The resulting file `/tmp/write_me.json` contains:

```json
[
    {
        "time": "2015-01-01T00:00:00.000Z",
        "name": "write_me",
        "value": 1
    },
    {
        "time": "2015-01-01T00:00:01.000Z",
        "name": "write_me",
        "value": 2
    }
]
```
