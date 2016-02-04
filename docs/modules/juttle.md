---
title: Juttle Module | Juttle Language Reference
---

# Juttle

Juttle is a simple module that exposes some aspects of the Juttle runtime for debugging purposes.

[TOC]

***

## Juttle.version

Constant that contains the version of the Juttle runtime.

For example:

```juttle
emit -points [{version: Juttle.version}]
```

```
┌───────────┐
│ version   │
├───────────┤
│ 0.4.0     │
└───────────┘
```

***

## Juttle.adapters

Function that returns an array with the type, version, and filesystem path for all configured adapters. This can be useful when debugging a juttle installation to ensure that all the expected modules are being loaded properly.

For example:

```juttle
emit -points Juttle.adapters()
```

```
┌─────────────┬───────────────────────────────────────────┬─────────┐
│ adapter     │ path                                      │ version │
├─────────────┼───────────────────────────────────────────┼─────────┤
│ influx      │ /root/juttle-influx-adapter/index.js      │ 0.3.0   │
├─────────────┼───────────────────────────────────────────┼─────────┤
│ elastic     │ /root/juttle-elastic-adapter/lib/index.js │ 0.4.0   │
├─────────────┼───────────────────────────────────────────┼─────────┤
│ file        │ /root/juttle/lib/adapters/file/index.js   │ 0.4.0   │
├─────────────┼───────────────────────────────────────────┼─────────┤
│ http        │ /root/juttle/lib/adapters/http/index.js   │ 0.4.0   │
├─────────────┼───────────────────────────────────────────┼─────────┤
│ stdio       │ /root/juttle/lib/adapters/stdio/index.js  │ 0.4.0   │
├─────────────┼───────────────────────────────────────────┼─────────┤
│ stochastic  │ /root/juttle/lib/adapters/stochastic.js   │ 0.4.0   │
├─────────────┼───────────────────────────────────────────┼─────────┤
│ http_server │ /root/juttle/lib/adapters/http_server.js  │ 0.4.0   │
└─────────────┴───────────────────────────────────────────┴─────────┘
```
