# Tail optimization

## Can optimize tail if the adapter supports it

### Juttle

    read test -debug 'optimization' | tail 10 | view result

### Output

    { type: "tail", limit: 10 }

## Can optimize tail with an implicit limit

### Juttle

    read test -debug 'optimization' | tail | view result

### Output

    { type: "tail", limit: 1 }

## Does not optimize tail if the adapter doesn't support it

### Juttle

    read test -debug 'optimization' -optimize false | tail 10 | view result

### Output

    { type: "disabled", reason: "unsupported_optimization" }

## Does not optimize tail if unsupported options are passed

### Juttle

    read test -debug 'optimization' | tail -xyz 123 10 | view result

### Output

    { type: "disabled", reason: "unsupported_tail_option" }

## Does not optimize tail by

### Juttle

    read test -debug 'optimization' | tail 10 by bananas | view result

### Output

    { type: "disabled", reason: "unsupported_tail_option" }
