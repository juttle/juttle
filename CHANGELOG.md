# Change Log

This file documents all notable changes to Juttle. The release numbering uses [semantic versioning](http://semver.org).

## 0.7.1

Released 2016-03-24

### Bug Fixes

- Ensure that all adapter read errors are returned as instances of `JuttleError` so they can be displayed in the context of the running program. [[#657](https://github.com/juttle/juttle/pull/657)]
- Include the value of the sort limit in the warning message when the limit is exceeded, and properly document the default limit. [[#655](https://github.com/juttle/juttle/pull/655)]
- Display the full stack trace for unexpected internal errors. [[#564](https://github.com/juttle/juttle/issues/564)]

## 0.7.0

Released 2016-03-23

### Major Changes

- Made `reduce -every` not emit marks at the end of epoch. This reverts the opposite change done in 0.5.0. [[#594](https://github.com/juttle/juttle/issues/594)]
- Reworked file-based module import to distinguish between system and user module imports and allow relative imports. [[#513](https://github.com/juttle/juttle/issues/513)]
- Added support for parsing column-based inputs (such as output of Unix commands like `ps`, `lsof`, etc.) to `file` and `stdio` adapters (`-format 'columns'`). [[#37](https://github.com/juttle/juttle/issues/37)]
- The `[]` and `.` operators can now be used on left-hand side of assignments. This allows assigning into nested point fields, e.g. `put response.code = 404`. [[#419](https://github.com/juttle/juttle/issues/419)]
- The `[]` and `.` operators can now be used in filters in `read`. This allows filtering by nested point fields, e.g. `read ... response.code = 200`. [[#384](https://github.com/juttle/juttle/pull/384)]

### Minor Changes

- Added the `-separator`, `-commentSymbol`, `-ignoreEmptyLines`, and `-allowIncompleteLines` CSV options to `read file`, `read stdio`, `read http`, and `read http_server`. [[#582](https://github.com/juttle/juttle/issues/582), [#603](https://github.com/juttle/juttle/issues/603)]
- Added support for bundling Juttle modules with adapters. [[#325](https://github.com/juttle/juttle/issues/325)]
- Added support for indexed assignment in assignment expressions. [[#587](https://github.com/juttle/juttle/pull/587)]
- Added support for more operators in assignment statements. [[#588](https://github.com/juttle/juttle/pull/588)]
- Added support for expression statements. [[#426](https://github.com/juttle/juttle/issues/426)]
- Changed representation of marks to objects. [[#567](https://github.com/juttle/juttle/pull/567)]
- Modified `view:points`, `view:mark`, and `view:tick` events to always put the payload into a `data` property. [[#633](https://github.com/juttle/juttle/pull/633)]
- Made passing of time bounds to views work also with `emit`. [[#639](https://github.com/juttle/juttle/pull/639)]
- Added line and column information to CSV parsing errors. [[#592](https://github.com/juttle/juttle/pull/592)]
- Added infrastructure for `sort` optimization. [[#628](https://github.com/juttle/juttle/pull/628)]
- Improved `read file` so that it emits points in batches. [[#527](https://github.com/juttle/juttle/pull/527)]
- Improved heuristic used when rendering `view table` in progressive mode in order to compute column widths better. [[#621](https://github.com/juttle/juttle/issues/621)]
- Made errors in `read` include full stack trace in the debug log. [[#583](https://github.com/juttle/juttle/pull/583)]
- Added Juttle tutorial. [[#285](https://github.com/juttle/juttle/pull/285)]
- Documented and tested the standard library. [[#391](https://github.com/juttle/juttle/issues/391), [#392](https://github.com/juttle/juttle/issues/392)]

### Bug Fixes

- Fixed problems with interrupting the CLI using <kbd>Ctrl+C</kbd> in some situations. [[#31](https://github.com/juttle/juttle/issues/31)]
- Fixed semantics of JuttleSpec error/warning assertions. [[#430](https://github.com/juttle/juttle/issues/430)]
- Fixed throwing errors when an import is redefined. [[#520](https://github.com/juttle/juttle/issues/520)]
- Fixed several incorrect error messages. [[#561](https://github.com/juttle/juttle/pull/561), [#566](https://github.com/juttle/juttle/pull/566), [#573](https://github.com/juttle/juttle/pull/573)]
- Fixed detection and displaying of Juttle errors in the CLI. [[#563](https://github.com/juttle/juttle/issues/563)]
- Fixed handling of runtime errors in the CLI. [[#565](https://github.com/juttle/juttle/issues/565)]
- Fixed `fg_processors` processing when an empty array is passed. [[#571](https://github.com/juttle/juttle/pull/571)]
- Fixed missing location information in runaway program errors. [[#572](https://github.com/juttle/juttle/issues/572)]
- Fixed CLI exit status when executed Juttle program fails. [[#575](https://github.com/juttle/juttle/issues/575)]
- Fixed wording of runaway program errors. [[#577](https://github.com/juttle/juttle/issues/577)]
- Fixed processing of argument of the `*` operator. [[#598](https://github.com/juttle/juttle/issues/598)]
- Removed deceleration towards real time from `pace`. [[#608](https://github.com/juttle/juttle/issues/608)]
- Fixed reducer argument coercion. [[#646](https://github.com/juttle/juttle/issues/646)]
- Fix handling of unary operators on string literals. [[#650](https://github.com/juttle/juttle/issues/650)]

## 0.6.0

Released 2016-03-09

### Major Changes

- Enabled runaway program detection. [[#473](https://github.com/juttle/juttle/issues/473)]
- The `.` operator can now be used to access object properties (not just module exports). This allows accessing nested point fields, e.g. `put body = response.body`. [[#497](https://github.com/juttle/juttle/pull/497)]

### Minor Changes

- Added the `-pageField` option to `read http`. It enables paging by passing the last value of specified field as a query parameter. [[#524](https://github.com/juttle/juttle/pull/524)]
- Removed [Bessel’s correction](https://en.wikipedia.org/wiki/Bessel%27s_correction) from the built-in `sigma` reducer and `stddev`, `z`, and `cv` reducers in the standard library. [[#540](https://github.com/juttle/juttle/pull/540)]
- Renamed the `sigma` built-in reducer to `stdev` (the old name still works but it is deprecated and will be removed in the future). Also renamed the `stddev` reducer in the standard library (here the old name doesn’t work anymore). [[#541](https://github.com/juttle/juttle/pull/541)]
- Allowed the `*"field"` syntax in static filter expressions. [[#483](https://github.com/juttle/juttle/issues/483)]
- Disallowed filtering on `time` in static filter expressions. [[#551](https://github.com/juttle/juttle/issues/551)]
- Extended location info stripping to all compiler stages, not just `parse` and `semantic`. [[#474](https://github.com/juttle/juttle/pull/474)]
- Made the compiler to run all flowgraph processors by default (previously it didn’t run any). [[#494](https://github.com/juttle/juttle/issues/494)]
- Allowed setting the implicit view using compiler options. [[#494](https://github.com/juttle/juttle/issues/494)]
- Improved error message displayed for invalid module references. [[#493](https://github.com/juttle/juttle/pull/493)]
- Documented the [Adapter API](https://github.com/juttle/juttle/blob/master/docs/adapters/adapter_api.md). [[#304](https://github.com/juttle/juttle/issues/304)]
- Documented the [Juttle ecosystem](https://github.com/juttle/juttle/blob/master/docs/juttle_ecosystem.md) and how the `juttle` npm package [relates to it](https://github.com/juttle/juttle#ecosystem). [[#506](https://github.com/juttle/juttle/pull/506)]

### Bug Fixes

- Fixed over-optimization of function calls in filter expressions. [[#454](https://github.com/juttle/juttle/issues/454)]
- Fixed handling of HTTP errors in `read http`. [[#465](https://github.com/juttle/juttle/issues/465)]
- Fixed missing type checks for the `[]` operator. [[#481](https://github.com/juttle/juttle/pull/481)]
- Fixed emitting of marks in optimized `reduce -every`. [[#484](https://github.com/juttle/juttle/issues/484)]
- Fixed handling of adapter names when displaying compilation results. [[#507](https://github.com/juttle/juttle/issues/507)]
- Fixed `reduce -every` to be consistent with `batch | reduce` on empty flows. [[#516](https://github.com/juttle/juttle/issues/516)]
- Fixed `reduce -every` to emit a mark at the beginning of the first batch. [[#537](https://github.com/juttle/juttle/issues/537), [#538](https://github.com/juttle/juttle/issues/538)]

## 0.5.2

Released 2016-02-26

### Bug Fixes

- Expose the parsers / serializers as part of the Adapter API module since they are required for some adapters.  [[#478](https://github.com/juttle/juttle/issues/478)]

## 0.5.1

Released 2016-02-25

### Bug Fixes

- Fixed a problem in which Juttle Error objects did not include the message when serialized to JSON. [[#467](https://github.com/juttle/juttle/issues/467)]

## 0.5.0

Released 2016-02-24

### Major Changes

- Implemented consolidated, versioned adapter API. Adapters should use the `AdapterAPI` global variable to access the API instead of `require`-ing modules from the `juttle` package directly. [[#367](https://github.com/juttle/juttle/issues/367)]
- Made `reduce -every` emit marks at the end of epoch. [[#52](https://github.com/juttle/juttle/issues/52)]

### Minor Changes

- Exposed the list of configured adapters in Juttle runtime (`Juttle.adapters()`) and CLI (`juttle --adapters`). [[#313](https://github.com/juttle/juttle/issues/313)]
- Added the `-append` option to `write file`. It currently works only with CSV nad JSONL formats. [[#286](https://github.com/juttle/juttle/issues/286)]
- Added support for time range options to `read http`. [[#194](https://github.com/juttle/juttle/issues/194)]
- Made debug logging controllable using the `DEBUG` environment variable. [[#373](https://github.com/juttle/juttle/issues/373)]
- Removed `RT-` and `JUTTLE-` prefixes from error codes. Also removed the `-ERROR` suffix in cases where it was redundant. [[#356](https://github.com/juttle/juttle/pull/356)]
- Disallowed `-from` to be equal to `-to` in sources. [[#322](https://github.com/juttle/juttle/issues/322)]
- Cleaned up proc inheritance chain. [[#371](https://github.com/juttle/juttle/pull/371)]
- Added allowed option validation logic into `base` and used it in built-in procs. [[#317](https://github.com/juttle/juttle/pull/317)]
- Added required option validation logic into `base`. [[#353](https://github.com/juttle/juttle/pull/353)]
- Changed `procName` from a prototype property on the procs into a function. [[#364](https://github.com/juttle/juttle/pull/364)]
- Unique proc identifier (`pname`) is now passed to procs in `params` which are now also attached to proc instances. [[#365](https://github.com/juttle/juttle/pull/365)]
- In views, changed `name` from a prototype property to an instance variable. [[#375](https://github.com/juttle/juttle/pull/375)]
- Added allowed option validation logic into `AdapterRead` and `AdapterWrite` and used it in built-in adapters. [[#317](https://github.com/juttle/juttle/pull/317)]
- Added required option validation logic into `AdapterRead` and `AdapterWrite` and used it in built-in adapters. [[#353](https://github.com/juttle/juttle/pull/353)]
- Added the `compileError` and `runtimeError` helper methods to `AdapterRead` and `AdapterWrite`. [[#362](https://github.com/juttle/juttle/pull/362)]
- Added the `thottledWarning` helper method to `AdapterRead` to allow triggering throttled warnings. [[#416](https://github.com/juttle/juttle/pull/416)]
- Added the `teardown` method to `AdapterRead` which the adapters can override to do cleanup. [[#362](https://github.com/juttle/juttle/pull/362)]
- Renamed the `defaultTimeRange` method in `AdapterRead` to `defaultTimeOptions` and extended its responsibility to also return default values of `-lag` and `-every`. This makes default values of these two options configurable per-adapter. [[#308](https://github.com/juttle/juttle/issues/308)]
- Allowed adapters to signal they are done reading using an `eof` flag in the `read` response (instead of creating an infinite `JuttleMoment`). [[#415](https://github.com/juttle/juttle/pull/415)]
- Changed `commonOptions` in `AdapterRead` from a getter to a function. [[#374](https://github.com/juttle/juttle/issues/374)]
- Removed the read/write shims for legacy adapters. [[#370](https://github.com/juttle/juttle/pull/370)]
- Made `Program#deactivate` not delete `this.graph`. [[#400](https://github.com/juttle/juttle/pull/400)]
- Cleaned up filter AST: [[#319](https://github.com/juttle/juttle/issues/319)]
  - Replaced `ReducerCall` by `FunctionCall`.
  - Renamed `NumericLiteral` to `NumberLiteral`.
  - Renamed `RegularExpressionLiteral` to `RegExpLiteral`.
  - Renamed `PropertyAccess` to `MemberExpression`.
  - Renamed `FunctionCall` to `CallExpression`.
  - Renamed the `value` property of `RegExpLiteral` to `pattern`.
  - Renamed the `text` property of `FilterLiteral` to `source`.
  - Renamed the `base` property of `MemberExpression` to `object`.
  - Renamed the `name` property of `MemberExpression` to `property`.
  - Renamed the `name` property of `CallExpression` to `callee`.
  - Renamed the `expression` property of `UnaryExpression` to `argument`.
  - Renamed the `condition` property of `ConditionalExpression` to `test`.
  - Renamed the `trueExpression` property of `ConditionalExpression` to `alternate`.
  - Renamed the `falseExpression` property of `ConditionalExpression` to `consequent`.
- Simplified filter AST: [[#418](https://github.com/juttle/juttle/pull/418)]
  - Removed `ExpressionFilterTerm` nodes (which the compiler typically just passes-through).
  - Replaced `SimpleFilterTerm` nodes which contain `StringLiteral` (and thus represent FTS) with structurally simpler `FulltextFilterTerm` nodes.
  - Replaced `SimpleFilterTerm` nodes which contain `FilterLiteral` (and thus represent embedded filter expression coming from an input) with the actual `FilterLiteral` AST (effectively inlining the literal).
- Simplified AST representation of fields. [[#318](https://github.com/juttle/juttle/issues/318)]
- Introduced `ASTTransformer` and `StaticFilterCompiler` classes. The latter is a base class the filter compilers in adapters shuld be generally derived from. [[#420](https://github.com/juttle/juttle/pull/420), [#446](https://github.com/juttle/juttle/pull/446)]
- Converted the codebase to use ES6 classes instead of `extendable-base`. [[#341](https://github.com/juttle/juttle/issues/341)]
- Replaced Backbone.js Events and built-in Node.js events with EventEmitter3. [[#49](https://github.com/juttle/juttle/issues/49)]
- Moved classes representing Juttle types (currently `JuttleMoment` and `Filter`) to `lib/runtime/types`. [[#312](https://github.com/juttle/juttle/pull/312)]
- Finished consolidation of Juttle runtime: [[#97](https://github.com/juttle/juttle/issues/97)]
  - Dissolved the global `Juttle` variable.
  - Made compiled programs not depend on `JuttleMoment` and `Filter` variables.
  - Made compiled programs not depend on Underscore.js.
- Simplified `lib/parser` structure. [[#300](https://github.com/juttle/juttle/pull/300)]
- Moved editor plugins into separate repositories. [[#379](https://github.com/juttle/juttle/pull/379), [#382](https://github.com/juttle/juttle/pull/382)]
- Added documentation on Juttle debugging. [[#307](https://github.com/juttle/juttle/issues/307)]

### Bug Fixes

- Made `read -timeField` remove the original field from points. [[#159](https://github.com/juttle/juttle/issues/159)]
- Fixed running `gulp examples-check test`. [[#263](https://github.com/juttle/juttle/issues/263)]
- Made all built-in reducer operations type-safe. [[#309](https://github.com/juttle/juttle/pull/309)]
- Fixed a bug where `NaN` could appear in arity error message. [[#328](https://github.com/juttle/juttle/issues/328)]
- Fixed error message generated by `reduce` when encountering out-of-order points. [[#330](https://github.com/juttle/juttle/issues/330)]
- Fixed time field options handling. [[#339](https://github.com/juttle/juttle/issues/339)]
- Fixed invalid date handling in `Date.new`. [[#344](https://github.com/juttle/juttle/pull/344)]
- Fixed missing title with multiple `table` views. [[#350](https://github.com/juttle/juttle/issues/350)]
- Fixed an error when assigning invalid `time` in `put`. [[#358](https://github.com/juttle/juttle/issues/358)]
- Fixed a crash when assigning invalid `time` in `reduce`. [[#359](https://github.com/juttle/juttle/issues/359)]
- Added `eof` tracking to `read` to prevent multiple `eof`s being sent downstream. [[#362](https://github.com/juttle/juttle/pull/362)]
- Fixed argument passing to `oops_fanin#warn_oops`, unmasking out-of-order point errors. [[#428](https://github.com/juttle/juttle/pull/428)]
- Fixed coercion of identifiers in multi-value options to strings. [[#444](https://github.com/juttle/juttle/issues/444)]

## 0.4.2

Released 2016-02-11

### Bug Fixes

- Work around an npm issue [[npm/#8982](https://github.com/npm/npm/issues/8982)] by running the peg parser generation as a prepublish and not a postinstall script. [[#398](https://github.com/juttle/juttle/pull/398)]

## 0.4.1

### Bug Fixes

Released 2016-02-10

- Fixed an error occurring with `reduce` on empty batches which produced `null` `time` field. [[#351](https://github.com/juttle/juttle/issues/351)]
- Updated Outrigger references in documentation and elsewhere to point to Juttle Engine and other components.

## 0.4.0

Released 2016-02-01

### Major Changes

- Implemented a new API for adapters in which `read` and `write` now have a simpler contract that is more isolated from the internals of the runtime and can more easily support behaviors like periodically reading for pseudo-live streams. [[#248](https://github.com/juttle/juttle/pull/248)]
- Added the `http_server` adapter. [[#224](https://github.com/juttle/juttle/pull/224)]
- Added the `JSON` module. [[#209](https://github.com/juttle/juttle/pull/209)]

### Minor Changes

- Allowed more expressive filter expressions in `filter`. [[#57](https://github.com/juttle/juttle/issues/57)]
- Added support for the `-last` option to the `emit` proc and modified the `stochastic` adapter to require one of `-from`, `-to`, or `-last`.
[[#242](https://github.com/juttle/juttle/pull/242)]
- Added the `-format` option to `read http` and `write file`. [[#287](https://github.com/juttle/juttle/issues/287), [#125](https://github.com/juttle/juttle/issues/125)]
- Optimized `read ... | head ...` with `file`, `stdio`, and `http` adapters. [[#261](https://github.com/juttle/juttle/issues/261), [#267](https://github.com/juttle/juttle/pull/267), [#278](https://github.com/juttle/juttle/pull/278), [#279](https://github.com/juttle/juttle/pull/279)]
- Made `emit -points` not add the `time` field to points that don’t contain it already. [[#77](https://github.com/juttle/juttle/issues/77)]
- Made the `-points` option of `emit` mutually exclusive with `-from`, `-to`, `-last`, `-limit`, and `-every`. [[#274](https://github.com/juttle/juttle/pull/274)]
- Made the `node-grok` dependency optional. [[#290](https://github.com/juttle/juttle/pull/290)]
- Replaced JSHint + JSCS by ESLint and fixed various issues ESLint found. [[#202](https://github.com/juttle/juttle/issues/202)]
- Enforced single quotes for strings in the codebase. [[#238](https://github.com/juttle/juttle/pull/238)]
- Enabled strict mode for the whole codebase. [[#240](https://github.com/juttle/juttle/issues/240)]
- Improved `README.md`. [[#218](https://github.com/juttle/juttle/pull/218)]

### Bug Fixes

- Fixed a memory leak when reading JSON files. [[#258](https://github.com/juttle/juttle/issues/258)]
- Fixed sources to handle numeric time field as a Unix timestamp. [[#166](https://github.com/juttle/juttle/issues/166), [#243](https://github.com/juttle/juttle/issues/243)]
- Fixed `emit` to properly output ticks when there are gaps in the points. [[#248](https://github.com/juttle/juttle/pull/248)]
- Fixed a problem where some warnings were labeled as errors. [[#255](https://github.com/juttle/juttle/pull/255)]
- Fixed error message produced in cases like `read elastic [1, 2, 3]`. [[#217](https://github.com/juttle/juttle/pull/217)]
- Fixed documentation of `read` options. [[#291](https://github.com/juttle/juttle/pull/291)]

## 0.3.1

Released 2016-01-21

### Bug Fixes

- Use our own `node-grok` fork which uses `collections^2.0` to avoid buggy reimplementation of `Array.prototype.find` in earlier versions. [[#225](https://github.com/juttle/juttle/issues/225)]

## 0.3.0

Released 2016-01-20

### Major Changes

- Added support for points with array/object field values. [[#55](https://github.com/juttle/juttle/issues/55)]
- Added support for Grok parsing to `file` and `stdio` adapters (`-format "grok" -pattern ...`). [[#37](https://github.com/juttle/juttle/issues/37)]
- Adapters are now loaded only when they are used. [[#83](https://github.com/juttle/juttle/issues/83)]

### Minor Changes

- Added a `rootPath` option to `read http` which allows to specify which part of a JSON object should be used when emitting points. [[#146](https://github.com/juttle/juttle/issues/146)]
- Changed string representation of some Juttle values, most notably arrays and objects. [[#200](https://github.com/juttle/juttle/pull/200)]
- Improved error messages for `read` options with invalid values. [[#17](https://github.com/juttle/juttle/pull/17)]
- Added location information to invalid adapter errors. [[#156](https://github.com/juttle/juttle/pull/156)]
- Added infrastructure for `tail` optimization. [[#129](https://github.com/juttle/juttle/pull/129)]
- Removed conversion of view options containing moments and durations into `Date` instances and numbers. [[#210](https://github.com/juttle/juttle/pull/210)]
- Added new `rawDurationString` option to `JuttleMoment#initialize` [[#186](https://github.com/juttle/juttle/pull/186)]
- Changed `JuttleMoment#compare` to implement `strcmp`-like comparison [[#191](https://github.com/juttle/juttle/pull/191)]
- Removed unused `Program#get_stats` method. [[#154](https://github.com/juttle/juttle/pull/154)]
- Removed unused `Juttle.proc.base#initialize` parameters. [[#132](https://github.com/juttle/juttle/issues/132)]
- Streamlined error-related code. [[#174](https://github.com/juttle/juttle/pull/174)]
- Updated compile command in the Emacs mode to use `outrigger-client`. [[#198](https://github.com/juttle/juttle/issues/198)]
- Added the `AUTHORS.md` file. [[#169](https://github.com/juttle/juttle/pull/169)]

### Bug Fixes

- Added code that detects multiple copies of `juttle` being loaded by adapters. [[#130](https://github.com/juttle/juttle/issues/130)]
- Removed inappropriate module-recursive parsing in `parser#parseValue` and `parser#parseFilter`. [[#163](https://github.com/juttle/juttle/issues/163)]

## 0.2.0

Released 2016-01-06

### Major Changes

- Added support for field to field comparisons in `filter`. [[#122](https://github.com/juttle/juttle/pull/122)]
- Renamed various occurrences of “sink” to “view” in the compiler and runtime implementation and API to be consistent with the current terminology. [[#40](https://github.com/juttle/juttle/issues/40)]
- Added a stdio backend to read and write from standard I/O using various formats. [[#36](https://github.com/juttle/juttle/issues/36)]
- Rewrote the file adapter to use asynchronous I/O and to add a buffering limit for large files. [[#6](https://github.com/juttle/juttle/issues/6)]
- Cleaned up the parser API. [[#19](https://github.com/juttle/juttle/pull/19)]

### Minor Changes

- Modified the compiler to detect sources by inheritance from `juttle.proc.source` as opposed to the presence of a `sourceType` attribute. [[#110](https://github.com/juttle/juttle/pull/110)]
- Removed the implementation of moment-parser from juttle to use the external moment-parser project. [[#26](https://github.com/juttle/juttle/issues/26)]
- Modified the table view in progressive mode to look at all points in the initial arriving batch when determining the columns and their widths. [[#33](https://github.com/juttle/juttle/issues/33)]
- Added a progressive mode to the text view. [[#22](https://github.com/juttle/juttle/pull/22)]
- Added support for time bounds options `-from` and `-to` to the file adapter. [[#65](https://github.com/juttle/juttle/issues/65)]

### Bug Fixes

- Fixed problems editing multiline programs in the CLI history. [[#80](https://github.com/juttle/juttle/issues/80), [#81](https://github.com/juttle/juttle/issues/81)]
- Removed `undefined` from the warning messages emitted by CLI views. [[#112](https://github.com/juttle/juttle/pull/112)]
- Increased the log limit in the stochastic backend. [[#39](https://github.com/juttle/juttle/issues/39)]
- Fixed JSON parsing in the file adapter to handle nested arrays. [[#21](https://github.com/juttle/juttle/issues/21)]
- Changed the table view to default to progressive mode only when there is only one sink in the program. [[#22](https://github.com/juttle/juttle/pull/22)]
- Fixed an issue in `read http` when reading a non-200 status response. [[#1](https://github.com/juttle/juttle/issues/1)]

## v0.1.0

Released 2015-12-18

### Major Changes

- Initial release of the standalone Juttle project.
