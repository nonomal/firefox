// |reftest| shell-option(--enable-temporal) skip-if(!this.hasOwnProperty('Temporal')||!xulRuntime.shell) -- Temporal is not enabled unconditionally, requires shell-options
// Copyright (C) 2022 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.plainyearmonth.prototype.since
description: Empty or a function object may be used as options
includes: [temporalHelpers.js]
features: [Temporal]
---*/

const instance = new Temporal.PlainYearMonth(2019, 10);

const result1 = instance.since(new Temporal.PlainYearMonth(1976, 11), {});
TemporalHelpers.assertDuration(
  result1, 42, 11, 0, 0, 0, 0, 0, 0, 0, 0,
  "options may be an empty plain object"
);

const result2 = instance.since(new Temporal.PlainYearMonth(1976, 11), () => {});
TemporalHelpers.assertDuration(
  result2, 42, 11, 0, 0, 0, 0, 0, 0, 0, 0,
  "options may be a function object"
);

reportCompare(0, 0);
