---
title: HTTP Server Adapter| Juttle Language Reference
---

# HTTP Server Adapter

The `http_server` adapter creates an http server and reads points from
incoming http requests.

[TOC]

## read http_server

Read points by pushing the contents of http requests into the Juttle flowgraph
```
read http_server -port port
                 -method method
                 -timeField timeField
```

Parameter         |             Description          | Required?
----------------- | -------------------------------- | ---------:
`-port`           | Port for HTTP Server to listen on | No; default: `8080`
`-method`         | HTTP method to use <br><br> Currently only supports `POST` or `PUT`. | No; default: `POST`
`-timeField`      | The name of the field to use as the time field <br><br>The specified field will be renamed to `time` in the body of the HTTP request. If the points already contain a field called `time`, that field is overwritten. This is useful when the source data contains a time field whose values are not valid time stamps.  | No; defaults to keeping the `time` field as is
`-rootPath`       | When the incoming data is JSON, use the specified path into the incoming object (expressed as `field1.field2`) to emit points | No

Currently the `read http_server` adapter will automatically parse incoming data based off of the `content-type` header. Here are the currently supported content-types:

    * `text/csv`: for [CSV](https://tools.ietf.org/html/rfc4180) data
    * `application/json` for [JSON](https://tools.ietf.org/html/rfc7159) data
    * `application/json` for [JSON lines](http://jsonlines.org/) data

_Example_

Create a simple http server on port `2000`.

```
{!docs/examples/adapters/http_server.juttle!}
```

Send points to server by running this curl command:

```
curl -H "Content-Type: application/json" -X POST -d '{"hello": "world"}'  http://localhost:2000
```
