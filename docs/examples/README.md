### Juttle Examples

Files herein are valid Juttle programs, used in documentation. 

To run a Juttle example from the CLI, do (from the top of juttle repo):

```
node bin/juttle docs/examples/DIR/FILE.juttle
```

To include a Juttle example in a Markdown doc article, use the markdown-include syntax
(in the .md file):

```
{!docs/examples/DIR/FILE.juttle!}
```

To remain valid, the Juttle examples are checked by `gulp examples-check` task.
Execute it on the command line (from the top of juttle repo) like this:

```
gulp examples-check
```

That task runs the following on each example .juttle file:

```
node bin/juttle --mode "compile" docs/examples/DIR/FILE.juttle
```

As long as the gulp task is passing, its output will consist of lines like this
(printed to stderr because we are suppressing stdout to not see verbose output of compiled programs),
followed by the "Finished" statement, which means "all good": 

```
FILE: docs/examples/DIR/FILE.juttle
...
[16:14:33] Finished 'examples-check' after 1.08 min
```

If the gulp task fails syntax check for some file, it will stop (i.e. fail altogether), 
having printed an error message like this one:

```
[15:55:39] FILE /Users/dmehra/git/juttle/docs/examples/sinks/scatterchart_faceted.juttle

events.js:72
        throw er; // Unhandled 'error' event
              ^
Error: Command failed: FILE /Users/dmehra/git/juttle/docs/examples/sinks/scatterchart_plain.juttle

Error at line 2:
   1:(
   2:    stochastic -source 'srch_cluster' -from :2 minutes ago: name = 'response_ms'
                                                         ^
SyntaxError: Expected ")", ",", ";", "|" or option but "n" found. code (SYNTAX-ERROR-WITH-EXPECTED)

    at ChildProcess.exithandler (child_process.js:637:15)
    at ChildProcess.EventEmitter.emit (events.js:98:17)
    at maybeClose (child_process.js:743:16)
    at Process.ChildProcess._handle.onexit (child_process.js:810:5)
```

You may also see warnings like this one, which do not fail the gulp task:

```
[16:13:51] FILE /Users/dmehra/git/juttle/docs/examples/modules/duration_get.juttle
Deprecation warning: moment construction falls back to js Date. This is discouraged and will be removed in upcoming major release. Please refer to https://github.com/moment/moment/issues/1407 for more info.
Error
    at Function.createFromInputFallback (/Users/dmehra/git/juttle/node_modules/moment/moment.js:746:36)

```

In case of errors, you must correct the syntax of the failing file and re-run `gulp examples-check`.
With warnings, it's up to your conscience.  

:construction: A gulp task to *run* juttle examples is not there yet, future work.

