Juttle Test Utilites
====================

`juttle-test-utils` is a bundle of utilities for performing end-to-end
testing of Juttle programs. When loaded, it modifies the Juttle
`source` proc to allow loading JSON data from a file. It also provides
a custom sink that provides promise-based access to the results of a
Juttle computation. Finally, it provides `check_juttle()` to perform
the Juttle parse, compilation, execution, and verifying that the
output of the Juttle program matches that in a file.

Getting Started
===============

If provided with arguments for `input_file` and `expect_file`,
`check_juttle()` will automatically compare the results of the
computation and throw an error using `expect` if the results
differ. `check_juttle()` always returns a promise.

As a convenience, file paths are handled as relative to the location
of the script (using `__dirname`).

```js
var runtime = require('juttleruntime/index');

engine = new runtime.Engine({ debug: true });

it('succeeds with a source and two sinks', function() {
    return check_juttle(engine, {
        program: 'source "input/sample.json" | put field2=field1 + 5 | (view sink1; view sink2)',
        expect_file: 'expected/sample-output.json',
        write_expect_file: false,
        return_data: false
    });
});
```

The input file can be loaded with the Juttle `source` proc. It should
be a JSON file containing an array of objects. This command is
specially patched to load input data from disk, rather than using
jQuery.

The expect file should be a JSON file containing an object wherein
each key is the expected results from each sink (`sink1` and `sink2`
in the above example).

If `write_expect_file` is set to `true`, `check_juttle()` will write to
the path provided in `expect_file`. The data in the file should be
confirmed by hand. This is intended to provide a simple way to
generate test data. Once a test script is checked in, this should be
set to false.

The promise is fulfilled with the result of the Juttle program.

Arguments
=========

- `program` (required) - Juttle program to execute, as a string.

- `expect_file` (optional) - Path to a JSON file to compare to the
  output of the Juttle program. See below for the format of this file.

- `expect_data` (optional) - Object representing the expected output
  of the Juttle program. See below for the format of this object.

- `write_expect_file` (optional) - If set to `true`, the file at
  `expect_file` will automatically be written to with the results of
  the Juttle program. This can be used to avoid tedious hand-writing
  of the expected output. This disables checking the output against
  `expect_file`, but `expect_file` must be specified. Defaults to
  `false`.


Input Data
==========

File Input
----------

Input data can be provided with the `source` proc from a JSON
file. The provided path can be absolute or relative to the location of
`juttle-test-utils.js`.

For example:

```js
[
  {
    "time": 1,
    "grumpkins": 86.89435452688485
  },
  {
    "time": 1,
    "grumpkins": 51.51528539136052
  },
  {
    "time": 2,
    "grumpkins": 69.61534135043621
  },
  {
    "time": 8,
    "grumpkins": 65.7509105745703
  }
]
```

Expected Data
=============

The expected data must be provided as an object in the following
format, with an entry matching each sink in the Juttle program:

```js
{
    "sink1": [
        {
            "time": 1,
            "grumpkins": 86.89435452688485
        },
        {
            "time": 1,
            "grumpkins": 51.51528539136052
        },
        {
            "time": 2,
            "grumpkins": 69.61534135043621
        },
    ],
    "sink2": [
        {
            "time": 5,
            "foo": 123
        }
    ]
}
```

Bug/Skipped Test List
=========
There are are a couple of tests in this folder that are skipped because
of a bug.  Below is the current bug list for the procs spec.  The tests
that are disabled will a comment saying `reenable when $JIRA_ISSUE is fixed`.

### procs.spec.js
- [ ] [PROD-2216](https://jut-io.atlassian.net/browse/PROD-2216): Head default value error
- [ ] [PROD-2217](https://jut-io.atlassian.net/browse/PROD-2217): Tail default value error
- [ ] [PROD-2227](https://jut-io.atlassian.net/browse/PROD-2227): Keeping an undefined value error
- [ ] [PROD-2237](https://jut-io.atlassian.net/browse/PROD-2237): Batch indefinite queuing after no more input points
- [ ] [PROD-2240](https://jut-io.atlassian.net/browse/PROD-2240): Collector improperly handles collecting undefined value
- [ ] [PROD-2241](https://jut-io.atlassian.net/browse/PROD-2241): Emitter -hz setting unit inconsistency
