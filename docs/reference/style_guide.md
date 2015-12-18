---
title: Style guide | Juttle Language Reference
---

Juttle Style Guide
==================

Juttle programs in this repository follow conventions of this style guide, as we believe it improves readability.

This guide uses pseudocode in some places. For working Juttle code examples, look at [docs/examples](https://github.com/juttle/juttle/tree/master/docs/examples) and [simple examples](https://github.com/juttle/juttle/tree/master/examples) on GitHub, and the full program example at the end of this document.

### Comments

Both `//` and `/* .. */` style comments are supported. Prefix lines of a long comment block with `*`. If commenting `//` to the right of multiple lines of code, strive to align the comments:

```pseudocode
...
emit -points data
| put *name = value   // transpose data points
| join                // combine data points with matching timestamps
...
```

### Whitespace

* The indentation step is 2 spaces. Don’t use tabs.
* Indent each continuation of a given step in a Juttle pipeline (see Flowgraphs).
* Avoid trailing whitespace or extra whitespace on blank lines.
* No fixed right-hand limit on line length, but be reasonable.
* One space before and after `=` in assignments:

```juttle
emit | put good = '1 space', just = 'like that'
```

### Functions, Reducers, Subgraphs

No space between a function, subgraph or reducer name and opening `(` in both declarations and calls. Note that sub invocation has a different parameter syntax than functions or reducers, but follows the same style guidelines.

One space between closing `)` and opening `{` (do not drop the opening `{` down to the next line in declarations).

Single space separation between parameters in function declarations and calls.

```pseudocode
function is_good(a, b) {
  // function body
}

reducer get_better(x, when = :now:) {
  // reducer body
}

sub stamper(mark, force) {
  // subgraph body
}

emit
| put life = is_good(1, 0)
| reduce things = get_better(life, :tomorrow:)
| stamper -mark 'awesome' -force 'light'
```

### Arrays and Objects

In both arrays and objects, leave a single space on the inside of `[ brackets ]` and `{ curly: braces }`. 

Single space after (but not before) the separators `,` and `:`.

```pseudocode
const nice_array = [ we, favor, spaces ];

const nice_object = { here: 'also', spaces: 'rule' };
```

For large arrays and objects, leave the brackets or curlies on their own lines. In Juttle this tends to happen with arrays of data points, and options objects for sinks.

```juttle
const input_points = [
  { time: '2015-12-01T10:51:04', name: 'style guide', status: 'progress' },
  { time: '2015-12-01T16:45:28', name: 'style guide', status: 'done' }
];

emit -points input_points
| view text -o {
    style: 'csv',
    limit: 10,
    title: 'TPS Report'
  }
```

### Capitalization

Constants should be capitalized.

Juttle's built-in modules use camelCase for naming functions, such as `Date.startOf()`.

The user-defined variable, function, reducer and subgraph names commonly use underscore_case in provided Juttle examples.

* variable_names_like_this: `var max_delta`
* function_names_like_this: `function is_good(a)`
* reducers_as_well: `reducer get_better(x)`
* subgraphs_too: `sub does_it_all()`
* CONSTANT_VALUES_LIKE_THIS: `const CUSTOM_COLOR`

When working with an existing body of Juttle code, adhere to the naming style chosen by the authors, be that camelCase, underscore_case or otherwise.

### Conditionals and Equality

In Juttle, if/else conditionals appear only inside functions and reducers; in flowgraph context, filter expressions are used to fork a flowgraph based on true/false evaluation.

In single-line conditionals, place the condition on the first line, without spaces inside the `(parentheses)` but with a space before opening `{`.

Place the statements on the next line (not on the same line as the condition), and align the closing brace `}` to the opening statement:

```pseudocode
function is_null(value) {
  if (value == null) {
    return true;
  } else {
    return false;
  }
}
```

In multi-line conditionals, keep the and/or/not operators on the line with the preceding condition, and drop the `{` onto its own line aligned with `if`:

```pseudocode
function is_expected(one, two, three) {
  if ((one == expected_one) &&
      (two >= min_two) &&
      (three != 'bad_third_value'))
  {
    return true;
  } else {
    return false;
  }
}
```

In flowgraph context, when the `filter` processor is used to conditionally branch the flowgraph, the equality test can be done with either `==` or `=` operator. The idiomatic Juttle uses `=` in that case:

```juttle
emit
| (
  filter time = null
  | put qed = "impossible";

  filter time != null
  | put qed = "emit always sets time";
)
```

When using ternary or null coalescing operators, leave a single empty space on both sides of the operator:

```juttle
emit
| put foo = (foo == null) ? 42 : 53
| put bar = bar ?? 53
```

### String Literals

Use single quotes for all string literals: `'good'` not <del>"bad"</del>.

Note that when running Juttle programs via CLI `-e` option, this allows to enclose the program body in double quotes, avoiding any need for escapes:

```cli
$ juttle -e "emit | put quotes = 'single', problems = 'none'"
```

Multiline string literals continued with the `\` character are not supported in Juttle, use string concatenation with `+` instead:

```juttle
emit
| put the_tyger = 'Tyger Tyger, burning bright, '
    + 'In the forests of the night; '
    + 'What immortal hand or eye, '
    + 'Could frame thy fearful symmetry?'
```

Note that multiline strings containing newline `\n` will get rendered with or without true newlines depending on the sink.

### Flowgraphs

For pipelines, generally put each proc at a separate line and format them like this:

```pseudocode
source "some gist"
| keep "thing"
| view table
```

Exception: if a short program contains only one pipe, it is acceptable to keep it on a single line:

```juttle
emit | put name = "example"
```

Always put a single whitespace after the pipe symbol, like this: `emit | put ...` not like this: <del>emit |put ...</del>

When the pipeline contains a parallel graph, format it like this, indenting each branch:

```pseudocode
source -option -option
| put this = that, biff = boff
| keep "on", "keeping", "on"
| (
  flowgraph;
  flowgraph;
) | join -first -outer -inner -last
| view donuthole
```

Note that each parallel branch ends with `;` (including the last one) and the final join (or merge) goes at the same line as the closing `)`.

If one or more parallel branches are multi-line, put a blank line between the branches:

```pseudocode
read -from :a long time ago: -to :sometime yesterday:
| (
  reduce
  | filter
  | view treechart;
 
  batch :fortnight:
  | sort ear_shape
  | write webmd;
)
```

The trailing semicolon at the end of a single-branch flowgraph is optional; Juttle treats semicolons as separators, not terminators, and this coding style generally omits the trailing semi. It is idiomatic to write `emit | view table` but it is also acceptable to write `emit | view table;` if desired.

### Processors

In general, each proc (short for "processor") invocation should be on its own line. For short proc invocations, include all the parameters on the same line. In case of multiple assignments (e.g. in `put` and `reduce` procs), if they are short enough, keep them all on the same line:

```juttle
emit
| put when = "i fall down", you = "put me", back = "together"
```

If multiple assignments are too long for one line, invoke the proc several times rather than splitting up assignments into several lines:

```juttle
emit
| put when = "i wake up"
| put well = "i know i'm gonna be, i'm gonna be"
| put the_man = "who wakes up next to you"
```

### Sources

For source procs which contain both options and filter expressions (e.g. `readx`), put all the options on the same line, and each filter expression on a separate line below the proc invocation, indented by one step relative to the proc name:

```pseudocode
read -from :a long time ago: -to :sometime yesterday:
  name ~ "*ears"
  AND normal = false
  AND symptoms in ['leaking', 'deaf', 'mossy']
```

### Sinks

For long invocations of sink procs, put the parameters on separate lines below the proc invocation indented by one step relative to the proc name:

```pseudocode
...
| view treechart
  -boundaryField "ear_shape"
  -title "Relative distribution of ear shape"
```

### Inputs

Format long input definitions similarly to long proc invocations:

```pseudocode
input a: combobox
  -items [ 'a', 'b', 'c' ]
  -multi true;
```

Name the input on the line where it is declared, indent each option, and end with a semicolon `;` on the same line as the last option. Array values follow array formatting.

## Full Program Example

This example is intentionally long and complex, to showcase style of each element; it is styled right, while not necessarily well designed.

```juttle
input resolution: text
  -description 'Resolution such as: approved, denied, on ice'
  -default 'denied';

const input_points = [
  { time: '2015-12-01T10:51:04', name: 'style guide', status: 'progress' },
  { time: '2015-12-01T16:45:28', name: 'style guide', status: 'done' }
];

const THE_FORCE = 'heavy';

function level_it(value) {
  if (value <= 50) {
    return 42;
  } else {
    return Math.pow(value, Math.round(value/10)); 
  }
}

function rand10() {
  return Math.floor(Math.random()*10);
}

sub stamper(mark, force = 'light') {
  put stamp = mark, power = force
}

emit -points input_points
| put position = count(), dice = rand10()
| put note = 'Reviewed on: ' + Date.format(:now:, 'MM/DD/YYYY')
    + ' by He-Who-Must-Not-Be-Named aka You-Know-Who'
| stamper -mark resolution -force THE_FORCE
| (
  filter dice < 5
  | put level = dice * 2;

  filter dice >= 5
  | put level = level_it(dice)
) 
| view text -o {
    style: 'csv',
    limit: 10,
    title: 'TPS Report'
  };

emit | put message = "Done!"
```

