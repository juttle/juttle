---
title: Juttle Tutorial | Juttle Language Reference
---

## Juttle Tutorial

:warning: XXX/dmehra this is unfinished

If you're here, you're probably just starting out with Juttle.

Juttle is a high-level language that is used to process and visualize
streams of data. At its core lies a simple dataflow language which is
used to declare and define processing flowgraphs, by stitching together
individual processing steps into a directed graph.

We'll introduce you to the key concepts in Juttle, starting off with
simple synthetic data, and then graduating to a real dataset coming from
GitHub.

After completing these tutorials, you will know enough Juttle to start
exploring and analyzing your own data. For more detailed Juttle
documentation than this, see [Juttle concepts](juttle_overview.html). 

In Juttle, *the basic unit of data is a point*. A point consists of a
number of key/value pairs, where the keys are strings and the values are
numbers, strings, Booleans, or null. Points flow through flowgraphs and
can be transformed, aggregated, or joined at each processing step.

