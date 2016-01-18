---
title: Grok Parser Overview | Juttle Language Reference
---

# Grok Parser

The grok parser exposes the ability to parse incoming data using the grok rules
which are supported by [logstash](https://www.elastic.co/guide/en/logstash/current/plugins-filters-grok.html).
The usage of the grok parser is currently supported by the [stdio](../stdio.md)
and [file](../file.md) adapters and can be expanded easily to others. ## Field Names

If your grok rule specified in `-pattern` option does not contain field name to
place the parsed data into, it will be placed into `message` field. See
[syslog example](#parsing-a-syslog-file) with `-pattern '%{SYSLOGLINE}'`. This
grok parser supports many [built in rules](https://github.com/Beh01der/node-grok/tree/master/lib/patterns).

When the grok rule is used to parse timestamps from the incoming text, you
should assign field name `time` in the rule, as that is where Juttle will look
for a valid timestamp. See [custom file example](#parsing-a-custom-file) with
`-pattern "%{TIMESTAMP_ISO8601:time}`

# Usage

## Parsing a syslog file

Since there quite a few [built in rules](https://github.com/Beh01der/node-grok/tree/master/lib/patterns)
already, parsing certain log types is very easy, such as:

```
read file -file '/var/log/syslog' -format 'grok' -pattern '%{SYSLOGLINE}'
| filter message~'*error*'
```

The above reads your local `/var/log/syslog` file and parses it using the grok
built in pattern for syslog and then looks for the `error` string in the
message of the parsed data points.

## Parsing a custom file

Let's say you had a log file that looked like so:

```
2016-01-02 16:34:03 status installed linux-image-extra-3.13.0-73-generic:amd64 3.13.0-73.116
2016-01-02 16:34:03 remove linux-image-extra-3.13.0-73-generic:amd64 3.13.0-73.116 <none>
2016-01-02 16:34:13 status installed linux-image-3.13.0-73-generic:amd64 3.13.0-73.116
2016-01-02 16:34:13 remove linux-image-3.13.0-73-generic:amd64 3.13.0-73.116 <none>
2016-01-02 16:34:13 status half-configured linux-image-3.13.0-73-generic:amd64 3.13.0-73.116
2016-01-14 08:58:07 status unpacked isc-dhcp-common:amd64 4.2.4-7ubuntu12.4
2016-01-14 08:58:07 upgrade openssh-client:amd64 1:6.6p1-2ubuntu2.3 1:6.6p1-2ubuntu2.4
2016-01-14 08:58:07 status half-configured openssh-client:amd64 1:6.6p1-2ubuntu2.3
```
**above is from the /var/log/dpkg.log of a debian machine** 

We want to parse this file using the [stdio](../stdio.md) adapter and be able to 
gather some information about the most upgraded packages. So we want to definitely parse
out the log line into the following sections:

```
|       time       | cmd  | subcmd  |               pkg_name                  | pkg_version |  
2016-01-02 16:34:03 status installed linux-image-extra-3.13.0-73-generic:amd64 3.13.0-73.116
```

After reading up on [grok](https://www.elastic.co/guide/en/logstash/current/plugins-filters-grok.html) 
the best approach to building up the custom grok rule is to add pattern
components one at a time, starting with:

```
%{TIMESTAMP_ISO8601:time} %{GREEDYDATA:message}
```

Which you can quickly test like so:

```
tail -10 /var/log/dpkg.log | juttle -e 'read stdio -format "grok" -pattern "%{TIMESTAMP_ISO8601:time} %{GREEDYDATA:message}" | view text'
[
{"time":"2016-01-03T00:34:03.000Z","message":"status installed linux-image-extra-3.13.0-73-generic:amd64 3.13.0-73.116"},
{"time":"2016-01-03T00:34:03.000Z","message":"remove linux-image-extra-3.13.0-73-generic:amd64 3.13.0-73.116 <none>"},
{"time":"2016-01-03T00:34:13.000Z","message":"status installed linux-image-3.13.0-73-generic:amd64 3.13.0-73.116"},
{"time":"2016-01-03T00:34:13.000Z","message":"remove linux-image-3.13.0-73-generic:amd64 3.13.0-73.116 <none>"},
{"time":"2016-01-03T00:34:13.000Z","message":"status half-configured linux-image-3.13.0-73-generic:amd64 3.13.0-73.116"},
{"time":"2016-01-14T16:58:07.000Z","message":"status unpacked isc-dhcp-common:amd64 4.2.4-7ubuntu12.4"},
{"time":"2016-01-14T16:58:07.000Z","message":"upgrade openssh-client:amd64 1:6.6p1-2ubuntu2.3 1:6.6p1-2ubuntu2.4"},
{"time":"2016-01-14T16:58:07.000Z","message":"status half-configured openssh-client:amd64 1:6.6p1-2ubuntu2.3"}
]
```

Iterating on the rule by adding more pattern elements, we arrive at the pattern:

```
%{TIMESTAMP_ISO8601:time} %{WORD:cmd} %{NOTSPACE:subcmd} %{NOTSPACE:pkg_name} %{NOTSPACE:pkg_version}
```

With the new pattern our parsed data now looks like so:

```
cat /var/log/dpkg.log | juttle -e "read stdio -format 'grok' -pattern '%{TIMESTAMP_ISO8601:time} %{WORD:cmd} %{NOTSPACE:subcmd} %{NOTSPACE:pkg_name} %{NOTSPACE:pkg_version}' | view text"
[
{"time":"2016-01-03T00:34:03.000Z","cmd":"status","subcmd":"installed","pkg_name":"linux-image-extra-3.13.0-73-generic:amd64","pkg_version":"3.13.0-73.116"},
{"time":"2016-01-03T00:34:03.000Z","cmd":"remove","subcmd":"linux-image-extra-3.13.0-73-generic:amd64","pkg_name":"3.13.0-73.116","pkg_version":"<none>"},
{"time":"2016-01-03T00:34:13.000Z","cmd":"status","subcmd":"installed","pkg_name":"linux-image-3.13.0-73-generic:amd64","pkg_version":"3.13.0-73.116"},
{"time":"2016-01-03T00:34:13.000Z","cmd":"remove","subcmd":"linux-image-3.13.0-73-generic:amd64","pkg_name":"3.13.0-73.116","pkg_version":"<none>"},
{"time":"2016-01-03T00:34:13.000Z","cmd":"status","subcmd":"half-configured","pkg_name":"linux-image-3.13.0-73-generic:amd64","pkg_version":"3.13.0-73.116"},
{"time":"2016-01-14T16:58:07.000Z","cmd":"status","subcmd":"unpacked","pkg_name":"isc-dhcp-common:amd64","pkg_version":"4.2.4-7ubuntu12.4"},
{"time":"2016-01-14T16:58:07.000Z","cmd":"upgrade","subcmd":"openssh-client:amd64","pkg_name":"1:6.6p1-2ubuntu2.3","pkg_version":"1:6.6p1-2ubuntu2.4"},
{"time":"2016-01-14T16:58:07.000Z","cmd":"status","subcmd":"half-configured","pkg_name":"openssh-client:amd64","pkg_version":"1:6.6p1-2ubuntu2.3"}
]
```

Which is precisely what we wanted to be able to write some **juttle** that can
help us analyze this log. For example if we wanted to find the top 3 most
upgraded packages:

```
cat /var/log/dpkg.log | juttle -e "read stdio -format 'grok' -pattern '%{TIMESTAMP_ISO8601:time} %{WORD:cmd} %{NOTSPACE:subcmd} %{NOTSPACE:pkg_name} %{NOTSPACE:pkg_version}' | filter cmd = 'upgraded' | reduce count() by pkg_name | sort count -desc | head 3"
```


