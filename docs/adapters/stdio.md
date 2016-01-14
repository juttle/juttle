---
title: STDIO Adapter | Juttle Language Reference
---

# STDIO Adapter

The `stdio` adapter allows reading points from stdin and writing points to stdout.

[TOC]

## read stdio

Supported formats are JSON array, JSON lines and CSV; see examples below.

```text
read stdio [-format <format>] [-timeField <fieldname>] [-timeUnit <unit>]
```

Parameter         |             Description          | Required?
----------------- | -------------------------------- | ---------:
`-format`         | Input input format: `csv` for [CSV](https://tools.ietf.org/html/rfc4180) data, `json` for [JSON](https://tools.ietf.org/html/rfc7159) data, or `jsonl` for [JSON lines](http://jsonlines.org/) data | No; defaults to `json`
`-timeField`      | Name of the field in the data which contains a valid timestamp  | No; defaults to `time`
`-timeUnit`       | Unit to use for any UNIX timestamps | No; defaults to `seconds`

The data is assumed to contain valid timestamps in a field named `time` by default; a different name for the time field may be specified with `-timeField` option. If the data contains fields `time` and another named field specified with `-timeField`, the original contents of field `time` will be overwritten by the valid timestamp from `timeField`.

For numeric [UNIX timestamps](https://en.wikipedia.org/wiki/Unix_time), specify a unit with the `-timeUnit` option.

Timeless data, which contains no timestamps, is acceptable; however certain operations which expect time to be present in the points, such as `reduce -every :interval:`, will execute with warnings or error out. Timeless data can be joined in the Juttle flowgraph with other data which contains timestamps; a common use case for reading timeless data from a file or another backend is to join it with streaming data for enrichment.

The stdio adapter does not support any kind of filtering (neither filter expressions, nor full text search). In order to filter the data from the `read stdio`, pipe to the [filter](../processors/filter.md) proc.

_Example: redirect a JSON file to your juttle program

This is an example using the CLI since this is where the stdio adapter comes in handy:

```bash
cat myfile.json | juttle -e "read stdio | filter hostname = 'lemoncake' | view table"
```

## write stdio

Supported formats are JSON array, JSON lines and CSV; see examples below.

```text
... | write stdio [-format <format>]
```

Parameter         |             Description          | Required?
----------------- | -------------------------------- | ---------:
`-format`         | Input input format: `csv` for [CSV](https://tools.ietf.org/html/rfc4180) data, `json` for [JSON](https://tools.ietf.org/html/rfc7159) data, or `jsonl` for [JSON lines](http://jsonlines.org/) data | No; defaults to `json`

_Example: writing csv data to stdout

```juttle
emit -from :2015-01-01: -limit 2
| put name = 'write_me', value = count()
| write stdio -format 'csv'
```

The resulting output will look like so:

```csv
time,name,value
2015-01-01T00:00:00.000Z,write_me,1
2015-01-01T00:00:01.000Z,write_me,2
```
