---
title: Fields Module | Juttle Language Reference
---

# Fields

Reducers to manipulate fields within your data.

## tail - reducer

```
... | reduce hosts = fields.tail(hostname, 5) | ...
```

Options    |                     Description                 | Required?
---------- | ----------------------------------------------- | --------- :
`field`    | the field name to store the values of in a list | Yes
`length`   | the number of recent values to retain           | No, default: `1`

The result is a field containing the N last values of the field specified.

## prior - reducer

```
... | reduce penultimate = fields.tail(hostname, 2) | ...
```

Options  |                       Description                   | Required?
-------- | --------------------------------------------------- | --------- :
`field`  | the field name to store the `nth` last value for    | Yes
`nth`    | index (from the end) of the value to keep track of  | No, default: `1`
`undef`  | value to return before nth value has been seen      | No, default: `null`
