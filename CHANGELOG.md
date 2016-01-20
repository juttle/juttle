# Change Log

This file documents all notable changes to Juttle. The release numbering uses [semantic versioning](http://semver.org).

## 0.2.0

Released 2016-01-06

### Major Changes

- Added support for field to field comparisons in `filter` [#122]
- Renamed various occurrences of "sink" to "view" in the compiler and runtime implementation and API to be consistent with the current terminology [#40]
- Added a stdio backend to read and write from standard I/O using various formats [#36]
- Rewrote the file adapter to use asynchronous I/O and to add a buffering limit for large files [#6]
- Cleaned up the parser API [#19]

### Minor Changes

- Modified the compiler to detect sources by inheritance from `juttle.proc.source` as opposed to the presence of a `sourceType` attribute [#110]
- Removed the implementation of moment-parser from juttle to use the external moment-parser project [#26]
- Modified the table view in progressive mode to look at all points in the initial arriving batch when determining the columns and their widths [#33]
- Added a progressive mode to the text view [#22]
- Added support for time bounds options `-from` and `-to` to the file adapter [#65]

### Bug Fixes

- Fixed problems editing multiline programs in the CLI history [#80, #81]
- Removed `undefined` from the warning messages emitted by CLI views [#112]
- Increased the log limit in the stochastic backend [#39]
- Fixed JSON parsing in the file adapter to handle nested arrays [#21]
- Changed the table view to default to progressive mode only when there is only one sink in the program. [#22]
- Fixed an issue in `read http` when reading a non-200 status response [#1]

## v0.1.0

Released 2015-12-18

### Major Changes

- Initial release of the standalone Juttle project
