# Juttle Adapter API

This document describes the low level API used to implement juttle adapters.

NOTE: This API is currently under active development and is highly likely to change.

__TOC__

## Accessing the Juttle Adapter API

Before loading the adapter module, the juttle runtime will put the `JuttleAdapterAPI` variable in global scope.

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
        FilterJSCompiler: <Utility for converting filter expressions into Javascript>
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

## Initialization

Each adapter is implemented as a node.js module that exports a single initializer function.

### initialize(config)

Initialize the adapter. Parameters include:

- *config*: Loaded configuration

Before an adapter is used for read / write in a program, the initializer is invoked with the loaded configuration of the adapter.

It should returns a Javascript object containing the name of the adapter, the implementation of the read and/or write modules, and an optional optimization module.

```
{
    name: <adapter name>
    read: <read adapter>,
    write: <write adapter>,
    optimize: <optimization module>
}
```


## Read

The implementation of `read` should be a Javascript class that should inherit from the `AdapterRead` base class.

It can implement / override the following methods:

### constructor(options, params)

Initialize the adapter.

Options contains the set of key/value options included in the read invocation.

Params contains the following:

* adapter: the name / location of the adapter AST node
* now: current program time
* logger_name: convenience name for initializing a debug logger

### allowedOptions()

Returns a list of the valid options for the adapter.

### requiredOptions()

Returns a list of the required options for the adapter.

### defaultTimeOptions()

Returns an object containing one or more of the following to be used as the default option values:

* from: starting time for the read
* to: ending time for the read
* lag: duration to trail real time for live reading
* every: batching interval for periodic live reads

These should each be an instance of the [JuttleMoment](https://github.com/juttle/juttle/blob/master/lib/runtime/types/juttle-moment.js) type.

### periodicLiveRead()

Returns a boolean indicating how the adapter handles reading live points.

If true, then when switching to live mode, the read base class will compute time intervals and make multiple calls to `read()` to read the data from the backend in chunks.

By default this behavior is disabled.

### start()

Called when the program activates.

### read(from, to, limit, state)

Read a set of points. Parameters indicate:

* from: starting time from which to read
* to: ending time for the read
* limit: maximum number of points to return
* state: optional continuation state from the previous call to `read()`

This should execute the read and return a promise that resolves with an object containing the following:

* points: array of data points in juttle native format
* state: optional continuation state that will be passed to the next invocation of read()
* readEnd: time up to which the adapter indicates that no more points will be read. If `readEnd === to` or `readEnd === :end:` then the read is complete.
* eof: If true, indication that the read is complete.

The read should return no more than `limit` points, starting at the `from` time (inclusive), up to the `to` time (exclusive). The `state` can be used to stash iteration state that will be passed to a subsequent call to read. 

## Write

The implementation of `write` should be a Javascript class that should inherit from the `AdapterWrite` base class.

It can implement / override the following methods:

### constructor(options, params)

Initialize the adapter.

Options contains the set of key/value options included in the write invocation.

Params contains the following:

* adapter: the name / location of the adapter AST node

### allowedOptions()

Returns a list of the valid options for the adapter.

### requiredOptions()

Returns a list of the required options for the adapter.

### start()

Called when the program activates.

### write(points)

Called when there is a new batch of points to write.

### eof()

Called when the flow of points has ended. Returns a promise that should resolve only when all the points have been flushed to the back end.
