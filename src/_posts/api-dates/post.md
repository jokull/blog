---
title: API and JavaScript Date Gotcha's
date: 2022-05-15
---

Dates and timezones especially can be a frustrating source of bugs during development of API's and
clients that consume them. Here are some points to help your team acquire an understanding of dates
necessary to avoid these bugs, and some API design guidelines.

Glossary:

- **Datetime**: A date object that includes time components, possibly offset or UTC timezone
  indication too
- **Absolute**: A point in time usually represented by a "unix epoch" which is the number of seconds
  since midnight Jan 1 1970
- **Aware**: A datetime with timezone embedded
- **Naive**: A datetime without timezone embedded
- **Calendar Date**: A date object but without time components, therefore also without timezone
  data. This is a confusing concept because it is not time-consistent, i.e. a date is not just a
  less accurate datetime, but another type of concept. For example, dates cannot be said to be
  datetimes but with nulled times (midnight 00:00).
- **UTC Midnight**: A datetime that has had its time component "nulled" to 00:00:00 and its timezone
  set to UTC (+0)
- **Offset**: Whereas a timezone is a geographic area where at any given time the offset from UTC is
  the same, usually measured in number of hours + or - from UTC. Do not confuse offsets and
  timezones. Only storing offsets is a "lossy" storage, but timezones are often stored on the server
  as a user field.
- **Shifting**: The operation of taking an aware datetime and getting its counterpart datetime in
  another timezone.
- **Nulling**: The operation of taking an aware datetime and removing – without shifting – its time
  and offset components.

## Stick with ISO 8601 formatting

Dates are `YYYY-MM-DD` formatted and datetimes append `Thh:mm:ss.sssZ` or `Thh:mm:ss.sss±hh:mm`.

## Store only absolutes in databases

Only in very niche situations should you store anything but the absolute in the database. Take for
example the time of a meeting invite. Two users in two different timezones can only agree upon the
absolute. For one person it can mean 1 PM and the other 2AM depending on the location. In other
words: what database columns usually are, are not days, hours and offsets, but absolute points in
time regardless of geography.

## What exactly is `Date`, and what it isn't?

`Date` is no more than an absolute with a bunch of methods. It does not store on its instances a
timezone, therefore you cannot alter or provide the timezone. Where timezone comes into play is when
various class methods depend on the system timezone identifier to represent human readable
representation of the absolute (like YYYY-MM-DD or HH:MM). These are methods like `getDate`,
`getYear`, and yes, `toString` and they only ever use a system timezone global for the offset,
allowing it to derive years, months, dates, hours, minutes etc.

Because whenever developers log `Date` instances to console it calls `toString` to log the value,
many people assume that `Date` as a data type includes timezone information. But it does not! The
methods depend on global values that are provided by the system or default to UTC.

With this insight, what would be the logical way to pass values to the constructor? I say epochs.
And sure enough, `Date` accepts an integer number representing milliseconds since UTC midnight Jan 1 1970. This global class should really be called `Epoch`!

Doing `new Date('2022-05-15')` fills in your current time and operating system offset(!). If the server
or part of the client codebase decides to shift this it could end up with a new date.

It is also dangerous to store calendar date fields as datetime and assuming the time components will
be ignored. A value like `2022-05-15T06:00Z` is an ambiguous calendar date when shifting to
different timezones. Nulled or in GMT (London or Reykjavík) it is May 15, shifted it ends up on May
14 if the client is in Pheonix, Arizona.

```js
//The following examples are executed in a browser in Pacific Daylight Time
```

```
> new Date("2022-05-15T06:00Z")
< Sat May 14 2022 23:00:00 GMT-0700 (PDT)
```

This is also why `new Date("2022-05-15")` is somewhat dangerous:

```
> new Date("2022-05-15")
< Sat May 14 2022 17:00:00 GMT-0700 (PDT)
```

Notice what information was filled in - it was **UTC midnight**.

```
> new Date("2022-05-15T00:00Z")
< Sat May 14 2022 17:00:00 GMT-0700 (PDT)
```

Using the non-string instantiation of `Date` yields, confusingly, a different fill (midnight, not
current time):

```
> new Date(2022, 04, 15)
< Wed Jun 15 2022 00:00:00 GMT-0700 (PDT)
```

Frustratingly months are zero-indexed in JS Date! This renders both options to init calendar dates
weird and confusing.

A guideline might be to at least disallow string instantiation of dates. You can enforce it
with [this eslint rule](https://github.com/amzn/eslint-plugin-no-date-parsing).

The [date-fns](https://npm.runkit.com/date-fns) library does it more consistently - filling in
midnight but with the client timezone:

```js
const parseISO = require('date-fns/parseISO')
parseISO('2022-05-15')
> Sun May 15 2022 00:00:00 GMT-0700 (PDT)
```

Or [@internationalized/date](https://www.npmjs.com/package/@internationalized/date) (my preferred option)

```js
import { CalendarDate, parseDate } from '@internationalized/date';;
parseDate("2022-05-15").toDate();
> Sun May 15 2022 00:00:00 GMT-0700 (Pacific Daylight Time)
new CalendarDate(2022, 5, 15).toDate();
> Sun May 15 2022 00:00:00 GMT-0700 (Pacific Daylight Time)
```

I suggest never using the JS Date constructor with strings.

## If possible let the browser or client environment determine the user timezone

Modern browsers and client environments have consistent ways to get the timezone of the user.
Browsers inherit the operating system settings for timezone and time. You can grab it in modern
browsers from `Intl`.

```js
Intl.DateTimeFormat().resolvedOptions().timeZone;
```

Depending on your needs you might want to sync this timezone with your user preferences on the API,
allow the user to overwrite this settings, set it explicitly, inherit from an org or workspace, etc.

The simple solution is to just follow the browser timezone and display all datetimes shifted to this
timezone.

## API shifts to UTC before storing and sending back datetimes

To make API responses deterministic, cachable and consistent it's always best to store and send
aware and UTC shifted dates, then rely on the client timezone awareness to shift dates back before
displaying them. This is also crucial to have indexable and sortable column values in your database.

```
Client > Server {parse, shift} > DB {make naive}
DB > Server {make aware} > Client {parse} > UI {shift}
```

In short: Servers shift on the way in, clients shift as they display in UI.

Backends might need to know user timezones for complex calculations, for sending smarter
notifications and such, but in most scenarios the timezone is, and should be, consolidated to UTC
and otherwise ignored. When timezone is really needed (example below) let the client provide it
alongside other request parameters. If your backend needs to know user timezones, store them on the
user, not alongside every time value.

## How to interpret values from clients

Example 1: The client wants to set the delivery calendar date of an order

```
HTTP PUT /orders/{id}
{deliveryDate: '2022-05-15'}
```

Here the server should accept either calendar dates or datetimes as long as they are correctly ISO
formatted. The question arises however, how to interpret datetimes values for calendar date fields?
Should we shift to UTC before nulling the datetime? Here it is safer to null without shifting. A
potentially problematic scenario is demonstrated here:

```
> (new Date("2022-05-15T02:00+10")).toISOString()
< "2022-05-14T16:00:00.000Z"
```

Shifting results in another calendar date. This is very likely not what the API consumer meant.

Therefore my recommendation is to accept datetime or calendar date ISO values for these fields, but
if the API receives an aware datetime it should _not_ shift it, so the rules, different from above
become:

```
Client > Server {parse, ignore/scrub offset, tz if datetime} > DB
DB > Server > Client {parse} > UI
```

SQL databases usually have a column type for calendar date values. If datetime is only support I
recommend storing an absolute timestamp where the value represents midnight of the date in the UTC
timezone - and then presenting in `YYYY-MM-DD` format in API responses.

Example 2: The client wants to filter orders by placement datetime

In this example we are dealing with another column type, a datetime not a calendar date.

```
HTTP GET /orders/{id}?from=2022-15-09&to=2022-15-15
```

The client has provided us with calendar dates, but the server should interpret them as datetime and
fill in **the client's offset's midnight**. This actually requires the client to provide us with
their offset or timezone. In other words, the server must understand not only the calendar dates,
but which midnight-to-midnight windows to set for the order placement time in question. A UTC
midnight might include or exclude orders that are actually in or out of the timezone midnight of the
user.

There is no way to convert a YYYY-MM-DD date to an absolute without assuming or providing the
offset, but offsets can be derived from timezones. The API might therefore want to look up the users
timezone if they have it on file in the DB or require it as a query arg:

```
HTTP GET /orders?from=2022-15-09&to=2022-15-15&timezone=America/Los_Angeles
```

With the query becoming timezone aware the server can deduce an offset and shift to the correct
midnight.

This will also come with the benefit of making the API response more cachable.
