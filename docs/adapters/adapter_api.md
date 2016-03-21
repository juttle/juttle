# Juttle Adapter API

This document describes the low level API used to implement juttle adapters.

NOTE: This API is currently under active development and is highly likely to change.

__TOC__

## Overview

An Adapter is the interface between the juttle runtime and a backend data source. The backend houses a data set, comprised of data points. Each data point contains a number of fields. In most cases, each data point also contains a timestamp.

For reads, the adapter's job is to interpret the options included in the juttle `read` command into a a query that selects the matching set of points, fetch the points via the query, construct JavaScript objects representing those data points, and pass them to the juttle runtime. For writes, the adapter's job is to take the output of programs, convert the data points to the native form used by the backend, and write the points to the backend.

More sophisticated adapters work together with the juttle optimizer to push aggregation operations directly into the backend. For example, to count the number of data points in a given time period you could simply fetch all the data points and have the juttle program perform the counting. However, if supported by the backend it would be more efficient to count the number of data points directly in the backend and return the count instead. And that's exactly what many adapters do.

## Writing an Adapter

Here are the main steps involved in writing a new adapter:

1. Create a JavaScript module that can be `require()`d by the juttle runtime.
2. From that module, export an initialization function to define the read/write capabilities of the adapter.
3. Implement ES6 classes deriving from AdapterRead/AdapterWrite that perform the work of reading from/writing to the backend data source.
4. (Optional) Write [juttle modules](../concepts/programming_constructs.md#Modules) that provide useful functionality and include them with the adapter.

We'll go through each of these steps in more detail below.

## JavaScript Modules, Classes and Methods

We've created the skeleton of an adapter in the [juttle-adapter-template](https://github.com/juttle/juttle-adapter-template) repository on github. That repository is a good reference for the layout of files, classes, functions, etc.

An adapter is packaged as a npm module. When the adapter is loaded, the CLI/juttle-engine perform a `require` of the module (i.e. the top-level directory). In [package.json](https://github.com/juttle/juttle-adapter-template/blob/master/package.json), the module defines a `main` of [lib/index.js](https://github.com/juttle/juttle-adapter-template/blob/master/lib/index.js), so `lib/index.js` is loaded.

The main function exported by `lib/index.js` takes a `config` argument containing the configuration object for the adapter, and returns an object with `name`, `read`, `write`, and `optimize` attributes:

```
{
    name: <adapter name>
    read: <read adapter class>,
    write: <write adapter class>,
    optimize: <optimization module>
}
```

The value for the `name` attribute corresponds to the `read <name>`/`write <name>` in juttle programs. The value for `read` is a class inheriting from [AdapterRead](../../lib/adapters/adapter-read.js) which performs the read work of the adapter. The value for `write` is an class inheriting from [AdapterWrite](../../lib/adapters/adapter-write.js) which performs the write work of the adapter. The value for `optimizer` is a module exporting functions `optimize_head`, `optimize_tail`, and `optimize_reduce` that do the work of optimizing the program.

`name` and `read` and/or `write` must be provided. `optimizer` is optional.

## Configuration

An adapter typically needs information such as hostnames, ports, application client credentials, etc. to communicate with a backend data source. These items are provided in the config object passed to the init() function exported by the module in `lib/index.js`.

The configuration is saved in the juttle [configuration file](../reference/cli.md#configuration). Within the configuration object, the module name is used to select the portion of the configuration to pass to the module's function. That is, given a configuration file:

```
{
    "adapters": {
        "_ADAPTER_NAME_": {...}
    }
}
```

The object below `_ADAPTER_NAME_` will be passed to the module's main function.

## Accessing the Juttle Adapter API

An adapter will need to access functions and objects from the Juttle runtime. All of these functions should be accessed via a global object [JuttleAdapterAPI](https://github.com/juttle/juttle/blob/master/lib/adapters/api.js). Before loading the adapter module, the juttle runtime will put the `JuttleAdapterAPI` variable in global scope.

This object contains:

```
{
    version: <API version>,
    AdapterRead: <Read Implementation base class>,
    AdapterWrite: <Write implementation base class>,
    compiler: {
        ASTVisitor: <Utility for traversing Juttle ASTs>,
        ASTTransformer: <Utility for transforming Juttle ASTs>,
        StaticFilterCompiler: <Utility for parsing filter expressions>,
        FilterJSCompiler: <Utility for converting filter expressions into JavaScript>
    },
    parsers: <Module containing parsers for csv / json / jsonl>,
    serializers: <Module containing serializers for csv / json / jsonl>,
    errors: <Error classes>
    getLogger: <Function to obtain a debug logger>
    runtime: {
        values: <runtime value utilities>,
        toNative: <convert an array of points into native juttle format>,
        parseTime: <convert an array of points and parse the time field>,
        reducerDefaultValue: <obtain the default value for a given reducer>
    },
    types: {
        Filter: <a juttle filter object>,
        JuttleMoment: <a moment or duration object>
    }
}
```

The adapter should reference the runtime using this API only and should not use a node.js `require()` call to pull in portions of the juttle compiler or runtime.

### Adapter API Versioning

The `version` property in the global JuttleAdapterAPI object indicates the adapter version in use by the juttle runtime. The adapter must also indicate the adapter version it is compatible with by including an `juttleAdapterAPI` property in package.json. Here's a snippet from package.json:

```
{
  "name": "juttle-_ADAPTER_NAME_-adapter",
  "version": "0.0.1",
  "description": "Juttle adapter for ADAPTER_NAME",
  ...
  "juttleAdapterAPI": "^0.5.0",
  "engines":
  ...
}
```

The version string follows rules for [semantic versioning](http://semver.org). If the API version in use by the juttle runtime is not compatible with the API version desired by the adapter, the adapter will not be loaded and the program will return an error.

## Read

### Live vs Historical

Juttle's `read` command specifies a timerange based on the values of the `-from`, `-to`, and `-last` options. When the timerange specified by `-from/-to/-last` is in the past, an adapter need only fetch the matching set of data points for the provided timerange. Such a program is called *historical*. When a part of the timerange is in the future, the adapter must also watch for new data points and pass them to the program. Such a problem is called *live*. A program can be both live and historical, with a `-from` in the past and a `-to` in the future. In that case, the adapter must fetch both old and newly-arriving data points.

Although many data points have natural time values, not all backends do. If a backend does not have meaningful time values, but was given a timerange in the `read` proc, your adapter should return an error.

For more information on Time Range Semantics, see [this page](https://github.com/juttle/juttle/wiki/Time-Range-Semantics).

### Fields and Searching

Every `read` command can contain a [filter expression](../concepts/filtering.md) that is used as an initial filter for the data points selected by the adapter. An adapter is not obligated to support a filter expression. The `filter` proc allows for filtering of points within programs. However, for performance reasons it is highly recommended that adapters implement filter expressions and push filtering into the backend whenever possible.

A filter expression either takes the form of a full-text search or a field match expression, possibly combined with logical operators like `AND`, `OR`, etc.

The filter expression is parsed by the juttle compiler and provided to the adapter as params.filter_ast, which is the output of the juttle compiler. The best way to parse a filter expression is to create a class deriving from [StaticFilterCompiler](../../lib/compiler/filters/static-filter-compiler.js) to step through the ast with callbacks for the terms of the filter expression to build up a backend-specific search expression.

### The `read` Proc

The `read` proc is the interface between the juttle program and the adapter implementation. The specific format of the options to `read` are not enforced by the Juttle compiler, and a read proc can have any number of options. Shared code can perform validation, see `allowedOptions` below. There are a set of commonly supported options that are supported by most adapters:

```
read <adapter> [-from <moment>] [-to <moment>] [-timeField <field>] [-raw <expression>] [<filter expression>]
```

* `-from`/`-to`: [Juttle Moments](../../lib/runtime/types/juttle-moment.js) representing the start and end of the time range for the read.
* `-last`: a JuttleMoment. shorthand for `from :now: - <last> -to :now:`
* `-lag`: a JuttleMoment. Controls how long to wait behind real time to fetch datapoints. For example, with  `-from :1 minute ago: -to :now: -lag :30s:`, the runtime will initially wait 30 seconds, and then ask the points for the time period `[:1 minute ago:-:now:]`. A lag is useful when your backend takes a while to have results ready (due to write delays, etc).
* `-timeField`: A field from the backend data that should be used as the time of the points emitted to the program.
* `-every`: A JuttleMoment. When performing live reads, poll for new data points at this interval.
* `-raw`: A backend-specific search parameter that is passed opaquely to the adapter. For the Gmail Adapter, the `-raw` expression is passed directly through as a Gmail advanced search string.

The implementation of `read` should be a JavaScript class that should inherit from the `AdapterRead` base class.

It can implement / override the following methods:

#### constructor(options, params)

Initialize the adapter.

Options contains the set of key/value options included in the read invocation.

Params contains the following:

* adapter: the name / location of the adapter AST node
* now: current program time
* logger_name: convenience name for initializing a debug logger
* filter_ast: the parsed filter expression

#### allowedOptions()

Returns a list of the valid options for the adapter.

#### requiredOptions()

Returns a list of the required options for the adapter.

#### defaultTimeOptions()

Returns an object containing one or more of the following to be used as the default option values:

* from: starting time for the read
* to: ending time for the read
* lag: duration to trail real time for live reading
* every: batching interval for periodic live reads

These should each be an instance of the [JuttleMoment](../../lib/runtime/types/juttle-moment.js) type.

#### periodicLiveRead()

Returns a boolean indicating how the adapter handles reading live points.

If true, then when switching to live mode, the read base class will compute time intervals and make multiple calls to `read()` to read the data from the backend in chunks.

By default this behavior is disabled.

#### start()

Called when the program activates.

#### read(from, to, limit, state)

Read a set of points. Parameters indicate:

* from: starting time from which to read
* to: ending time for the read
* limit: maximum number of points to return
* state: optional continuation state from the previous call to `read()`

`from` and `to` are JuttleMoments.

This should execute the read and return a [promise](http://bluebirdjs.com) that resolves with an object containing the following:

* points: array of data points in juttle native format
* state: optional continuation state that will be passed to the next invocation of read()
* readEnd: time up to which the adapter indicates that no more points will be read. If `readEnd === to` or `readEnd === :end:` then the read is complete.
* eof: If true, indication that the read is complete.

The read should return no more than `limit` points, starting at the `from` time (inclusive), up to the `to` time (exclusive). The `state` can be used to stash iteration state that will be passed to a subsequent call to read.

## Write

### Program output == JSON points

An adapter receives arrays of JSON points from a given juttle program via the `write` method. Write should save those points to its associated backend in a timely manner and in a way that does not starve the program for resources. Whenever necessary the adapter should use asynchronous functions (specifically Promise chains) that do not block the node.js event loop.

### Orderly shutdown of programs via `eof()`

The juttle program informs the adapter that the program is finished by calling the `eof` method. This is an indication that the program has completed and no additional points will be passed to the adapter.

This should return a promise that resolves when all output, including any output from prior calls to `write()`, has been completed.

### The `write` Proc

Unlike `read`, there are no conventions for a standard set of options supported by all adapters. In general, options related to configuration (hostnames, API keys, etc) should be specified in the adapter's configuration rather than provided as arguments to the `write` proc.

The implementation of `write` should be a JavaScript class that should inherit from the `AdapterWrite` base class.

It can implement / override the following methods:

#### constructor(options, params)

Initialize the adapter.

Options contains the set of key/value options included in the write invocation.

Params contains the following:

* adapter: the name / location of the adapter AST node

#### allowedOptions()

Returns a list of the valid options for the adapter.

#### requiredOptions()

Returns a list of the required options for the adapter.

#### start()

Called when the program activates.

#### write(points)

Called when there is a new batch of points to write.

#### eof()

Called when the flow of points has ended. Returns a promise that should resolve only when all the points have been flushed to the back end.

## Logging

To log messages, use the logger instance variable, for example:

```javascript
this.logger.debug(`Got ${response.messages.length} potential messages`);
```

Log messages are passed through the Juttle runtime and eventually logged to files/console and/or passed to the browser.

## Returning Errors

To throw errors, use the methods `compileError` or `runtimeError` in the `AdapterRead` base class to construct an error and throw() it. Here's an example:

```javascript
var unknown = _.difference(_.keys(options), this.allowed_options);
if (unknown.length > 0) {
    throw this.compile_error('UNKNOWN-OPTION-ERROR', {
        option: unknown[0]
    });
}
```

## Adapter Modules

An adapter may also include juttle modules that provide useful functionality for users writing juttle programs. An example of this is the [AWS adapter](https://github.com/juttle/juttle-aws-adapter), which includes modules that provide aggregations of raw data points into demographic and aggregate information.

By convention, all files below the directory `<adapter installation dir>/juttle` are made available to juttle programs. They can be imported using the path `adapters/<adapter name>/<path-to-module-file>`. The path below the root `adapters/<adapter name>` should correspond to the path below `juttle`. Here's an example directory layout:

```juttle-no-syntax-check
// assuming .../node_modules/juttle-aws-adapter/juttle/aggregations.juttle exists

import 'adapters/aws/aggregations.juttle' as Adapter_aws;

read aws product='EC2'
| Adapter_aws.aggregate_EC2
| filter demographic='EC2 Instance Type'
| keep demographic, name, value
| view table

```

## Additional Resources

When it comes time to finish and publish your adapter, here are some useful checklists to follow to ensure that the adapter is fully tested and has a consistent structure to existing adapters.

* [Adapter Test Checklist](https://github.com/juttle/juttle/wiki/Adapter-Test-Checklist)
* [Adapter Publishing Checklist](https://github.com/juttle/juttle/wiki/Adapter-Publishing-Checklist)

Have fun!


