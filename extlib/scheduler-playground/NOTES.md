# Modes of operation

## Query types

### Historical (completely in past)

```
read adapter -from :2h ago: -to :1h ago:              // Historical query, returns 1 hour of data in the past.
```

### Live (starts now or in the future)

```
read adapter -from :now: -to :end:                    // Live query, starts immediately.
read adapter -from :1h from now: -to :end:            // Live query, starts in 1 hour.
```

### Superquery (has both historical and live part, starting now)

```
read adapter -from :1h ago: -to :end:                 // Superquery.
```

## Handling of queries

### Historical

- Static (from, to)
- Batches of records
  - sliding time window by fixed time interval
  - moving from + fixed amount of points

### Live

- Pseudo-live
- Polling in regular intervals for new data

### Super-query

- Combined approach

## Scheduling

- Keep adapter buffers small
- Keep adapter time-windows close, given latency on the network and different type of queries

### Historical - Historical

### Historical - Live

### Live - Live
