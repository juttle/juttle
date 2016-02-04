# `juttle`: The Juttle Command Line

`juttle` is the command line interface for running juttle programs. It reads data from configured backends via adapters, executes juttle programs, and provides terminal-oriented visualizations that allow you to view the output of programs.

For more complex visualizations, you can use [outrigger](https://github.com/juttle/outrigger), which provides browser-based visualizations and support for [input controls](../concepts/inputs.md).

## Usage

`juttle` is run as follows:

```
usage: juttle [--version] [--mode <mode>] [--config <config>] [--color/--no-color]
              [--show-locations] [--optimize] [--input name=val] [juttle-file]
     --version show juttle CLI version
     --mode <mode>: one of "parse", "semantic", "build", "flowgraph", "compile", "run"
     --config <config>: path to the juttle interpreter configuration file
     --optimize runs optimization
     --show-locations displays locations in the parse tree
     --color/--no-color turns CLI output coloring on and off
     --input name=val defines input `name` with value `val`
     --e <juttle-src>: run the juttle source and exit
     [juttle-file]: run the provided juttle file and exit
```

Running `juttle` with no arguments launches a read-eval-print loop with the prompt:

```
juttle>
```

## Ways to run juttle programs

`juttle` provides 3 different ways to run juttle programs:

Directly within the CLI:
```
juttle> emit -limit 1 | view table
┌────────────────────────────────────┐
│ time                               │
├────────────────────────────────────┤
│ 2015-12-18T21:40:18.555Z           │
└────────────────────────────────────┘
```

From the command line, via the `-e <juttle source>` command line argument:
```
$ juttle -e 'emit -limit 1 | view table'
┌────────────────────────────────────┐
│ time                               │
├────────────────────────────────────┤
│ 2015-12-18T21:40:18.555Z           │
└────────────────────────────────────┘
```

From a file, by naming a file on the command line:
```
$ cat my-program.juttle
emit -limit 1 | view table
$ juttle my-program.juttle
┌────────────────────────────────────┐
│ time                               │
├────────────────────────────────────┤
│ 2015-12-18T21:40:18.555Z           │
└────────────────────────────────────┘
```

## CLI Features

### Command line editing

You can edit command lines via the typical set of editor keys (arrows plus `^f`/`^b`/`^a`/`^e`/etc.)

### Command history

`juttle` maintains a command history. You can navigate through this history via the typical set of editor keys (arrows plus `^n`/`^p`/etc.). This history is saved to `$HOME/.juttle/history`.

### Multi-line input

To run multi-line juttle programs from the read-eval-print loop, begin a multi-line program with a `<` and finish it with a `.`:
```
juttle> <
Starting multi-line input. End input with a line containing a single ".":
emit -limit 1
   | view table
.
┌────────────────────────────────────┐
│ time                               │
├────────────────────────────────────┤
│ 2015-12-18T22:06:36.141Z           │
└────────────────────────────────────┘
```

### Help

Typing `help` provides a summary of the commands available:

```
juttle> help
usage:
mode {mode} - change mode
src {path} - source file as juttle program
< - start multi-line input
{juttle} - evaluate juttle program
. - end multi-line input
exit, \q - close shell and exit
help, \? - print this usage
clear, \c - clear the terminal screen
```

## Views

###table
`juttle` supports [table](../sinks/view_table.md) and [text](../sinks/view_text.md) views:


```
juttle> emit -limit 1 | view table
┌────────────────────────────────────┐
│ time                               │
├────────────────────────────────────┤
│ 2015-12-18T22:09:44.478Z           │
└────────────────────────────────────┘
```

###text

```
juttle> emit -limit 1 | view text
[
{"time":"2015-12-18T22:10:12.101Z"}
]
juttle>
```

If a program does not contain a view, `juttle` automatically adds one based on the value of the `implicit_view` configuration item (see below).

## Errors

If your juttle program contains syntax or runtime errors, `juttle` provides details on the error and highlights the section of the program that led to the error:

```
juttle> emit limit 1 | view table
<input>:1:6:
1:emit limit 1 | view table
^
Expected ";", "|" or option but "l" found. (SYNTAX-ERROR-WITH-EXPECTED)
```

```
juttle> import 'no-such-module.juttle' as mymodule; emit -limit 1 | table;
<input>:1:1:
1:import 'no-such-module.juttle' as mymodule; emit -limit 1 | table;
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Error: could not find module "no-such-module.juttle" (MODULE-NOT-FOUND)
```

```
juttle> import 'm1.juttle' as mymodule; emit -limit 1 | table;
In module included from <input>:
m1.juttle:1:8:
1:export consty foo=bar;
^
Expected "function", "reducer", "sub" or processor but "c" found. (SYNTAX-ERROR-WITH-EXPECTED)
```

## Configuration

The CLI tries to read runtime configuration from various locations on
the filesystem, in the following order:

* **&lt;cwd&gt;/.juttle-config.json**
* **&lt;cwd&gt;/.juttle-config.js**
* **&lt;$HOME&gt;/.juttle/config.json**
* **&lt;$HOME&gt;/.juttle/config.js**

The **.json** files are processed as JSON while the **.js** files are loaded
with `require` and therefore need a single `module.exports` entry, see
[here](https://nodejs.org/api/modules.html) more details on node module
exports.

Generally `juttle-config` is used to configure adapters to various
backends. The only `juttle`-specific configuration item is
`implicit_view`, which defines what the default view is at the end of
your flowgraph when not explicitly specified. For example if you set
it to `text` like so:

**.juttle-config.json**:
```
{
"implicit_view": "text"
}
```

And then executed:


```
juttle> emit -limit 10
```

You would get:

```
[
{"time":"2015-12-07T22:32:06.483Z"},
{"time":"2015-12-07T22:32:07.483Z"},
{"time":"2015-12-07T22:32:08.483Z"},
{"time":"2015-12-07T22:32:09.483Z"},
{"time":"2015-12-07T22:32:10.483Z"},
{"time":"2015-12-07T22:32:11.483Z"},
{"time":"2015-12-07T22:32:12.483Z"},
{"time":"2015-12-07T22:32:13.483Z"},
{"time":"2015-12-07T22:32:14.483Z"},
{"time":"2015-12-07T22:32:15.483Z"}
]
```

## Module Resolution

When juttle programs contain [modules](..//concepts/programming_constructs.md#modules), `juttle` resolves modules by searching the following paths, in this order:

*The current working directory
*Any paths listed in the environment variable `JUTTLE_MODULE_PATH`, which is a colon-separated list of directories.

The first module file found is used.

## Configuring Adapters

Connections to [external adapters](../adapters/index.md) are configured in the "adapters" section of the configuration. Each entry should be the name of the adapter along with any adapter-specific configuration. By default, the CLI will try to load the adapter by executing `require(adapter)` but if the `path` attribute exists then it will try to load the adapter from the specified path.

For example, to configure the Elasticsearch adapter, first run `npm install juttle-elastic-adapter` and add the following to your `juttle-config` file, updating the address and port to point to the location of your Elasticsearch cluster.

```
{
    "adapters": {
        "elastic": {
            "address": "localhost",
            "port": 9200
        }
    }
}
```

By default, the runtime will try to load the adapter from an npm module matching the name `juttle-<type>-adapter`, so for the above example to work properly, you need to make sure that `juttle-elastic-adapter` exists somewhere in your npm load path.

To load an adapter from a different location, add a `path` attribute to the adapter configuration that contains the module path to be used when loading the adapter.

## Logging

`juttle` uses [log4js](http://stritti.github.io/log4js/) for logging, and can be controlled via the standard `log4js.json` file. In addition, unless the environment variable `DEBUG` is set to 1, `juttle` sets the default log level to 'info'.
