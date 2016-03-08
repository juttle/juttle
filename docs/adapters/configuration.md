## Goal
Most simply and consistently across adapters, allow users to configure one or multiple connections in addition to a single path to the adapter module. 

## Options and Problems

### 1. Single connection object.
- Eval: Simple, can include `path`, but does not allow for several connections/environments (e.g. prod/staging/dev).
- Example: 
```
{
  host: 'local',
  port: 5432,
  path: 'optional'
}
```

### 2. An array of connection objects
- Description: Each member of array has a unique `id` field so the user can indicate which connection to use.
- Eval: Simple but we cannot assign `path` to the array unless we enforce some hacky rule to always insert it into the first element.
- Example: 
```
[
{
  id: "default",
  host: 'local',
  port: 5432
},
{
  id: "prod",
  host: 'prodHost',
  port: 5432
}
]
```

### 3. An object with a key `instances`
- Description: An object with a key `instances` that holds option number 2 above but also has optional key `path`. 
- Eval: An extra layer of nesting in a config file is less simple than option 1 and 2 and user usually won't need to specify path anyway so most of the time this structure won't be necessary.
- Example:
```
{ 
instances:[
  {
    id: "default",
    host: 'local',
    port: 5432
  },
  {
    id: "prod",
    host: 'local',
    port: 5432
  },
],
path: "path"
}
```

### 4. An object with with unique key `id`s
- Description: An object with a key `path` and connection objects as values behind unique `id` keys.
- Eval: Less simple due to nesting and can be ambiguous if you allow a single connection object as well.
- Example:
```
{
  default: {
    host: 'local',
    port: 5432
  }
  prod: {
    host: 'prod',
    port: 5432
  }
  path: 'path'
}
```

## Adapter implementation
Adapters will receive a single format (always an array, always with `id`s) and will use the first by default.
```
[
  {
    id: "default",
    host: 'local',
    port: 5432
  },
  {
    id: "prod",
    host: 'local',
    port: 5432
  },
]
```

## Suggested Solution
All options 1-3 should be accepted allowing the user to use the simplest form they need.
- As simple and flexible as the configuration data requires it to be.
- No unnecessary nesting.
- No ambiguity.
- Adapters only need implement one format => standardized in Juttle repo.
- Most of the current setups don't need any changing.

## Additional thoughts:

- Errors before adapter instantiation: Throw if there is no `id` value in any one config object (after `default` added to first/only object if no id present).
- Documentation: The readme for adapters will only mention options 1 and 2.
- ids: Any multi-connection object needs unique `id`s but if `id`s are assigned the adapters will use the use the first in the array as the default connection.