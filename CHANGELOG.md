# Change Log

This file documents all notable changes to Juttle. The release numbering uses [semantic versioning](http://semver.org).

## Unreleased Changes

### Major Changes

- Create `http_server` adapter.

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
