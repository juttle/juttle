---
title: HTTP Adapter| Juttle Language Reference
---

# HTTP Adapter

The `http` adapter allows reading points from, or writing points to, an http endpoint.

[TOC]

## read http

Read points by issuing an HTTP request and pushing the response into the Juttle flowgraph, with options:

```
read http -url url
          -method method
          -headers headers
          -body body
          -timeField timeField
          -includeHeaders true/false
```

Parameter         |             Description          | Required?
----------------- | -------------------------------- | ---------:
`-url`            | URL to issue the HTTP request at | Yes 
`-method`         | HTTP method to use               | No; default: `GET`
`-headers`        | headers to attach to the HTTP request in the form `{ key1: "value1", ..., keyN: "valueN" }` | No; default: `{}`
`-body`           | body to send with the HTTP requests | No; default: `{}`
`-timeField`      | The name of the field to use as the time field <br><br>The specified field will be renamed to `time` in the body of the HTTP request. If the points already contain a field called `time`, that field is overwritten. This is useful when the source data contains a time field whose values are not valid time stamps.  | No; defaults to keeping the `time` field as is
`-includeHeaders` | When set to true the headers from the response are appended to each of the points in the response | No; default: `false`

Currently the `read http` adapter will automatically parse incoming data based off of the `content-type` header. Here are the currently supported content-types:

    * `text/csv`: for [CSV](https://tools.ietf.org/html/rfc4180) data
    * `application/json` for [JSON](https://tools.ietf.org/html/rfc7159) data
    * `application/json` for [JSON lines](http://jsonlines.org/) data 

_Example_

Example of how to hit the Github Issues API and retrieve all issues from the
beginning of time on a specific repository in the correct chronological order:

```
{!docs/examples/adapters/http_github_open_issues.juttle!}
```

## write http

Write points out of the Juttle flowgraph by making an HTTP request, with options:

```
write http -url url
           -method method
           -headers headers
           -maxLength length
```

Parameter    |             Description          | Required?
------------ | -------------------------------- | ---------:
`-url`       | URL to issue the HTTP request at | Yes 
`-method`    | HTTP method to use               | No; default: `POST`
`-headers`   | headers to attach to the HTTP request in the form `{ key1: "value1", ..., keyN: "valueN" }` | No; default: `{}`
`-maxLength` | maximum payload length per HTTP request, as number of data points (not bytes) <br><br>If the number of data points out of the flowgraph exceeds `maxLength` then multiple HTTP requests will be sent. | No, default: 1 (each data point out of the flowgraph becomes one HTTP request)

Each set of points passed along by the Juttle flowgraph will be placed into the body of an HTTP request, as defined by the specified options. The `maxLength` parameter allows to dictate how many points to push at most with each HTTP request. On failure, a warning will be displayed.

_Example_

Simple example of using the `http` adapter to create gists in GitHub:

```
{!docs/examples/adapters/http_post_to_a_gist.juttle!}
```

