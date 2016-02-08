Inputs
======

Input controls enable Juttle programs to be parameterized by user interface elements such as text inputs or dropdowns.

The syntax for inputs is:

```
input <name>: <type> <options>
```

The `name` can be any valid identifier and is treated in the program like a  [constant](./programming_constructs.md#consts). This way the value can be used as an option to a proc, an element in a filter expression, a view parameter, or more.

Inputs can be declared in a Juttle program either at the top level of a flowgraph or inside a [subgraph](./programming_constructs.md#subgraphs).

Before the program is run, an application environment like [juttle engine](http://github.com/juttle/juttle-engine) first evaluates the flowgraph to determine which inputs are in the program and renders them for a user. Then once the user has made their selection, the application gathers the selections and includes them when running the program.

Note: The specific types of supported inputs and the supported options are supplied from the application environment and are not part of Juttle itself. The Juttle CLI has limited support for text and number inputs using command line options.

_Example: Parameterizing a simple program with inputs using the CLI_

A simple example of a program that accepts two inputs -- one to control the number of data points and one to control the message that is printed:

```juttle
input num: number -default 5 -label "Number of Points";
input text: text -default "Hello World" -label "Message";

emit -limit num | put message=text
```

By default this will emit 5 points with the message "Hello World".

However both the number of points and the message are configurable, so the program can be run with other inputs to control the number of points and the message.

:construction: This document needs to be completed.
