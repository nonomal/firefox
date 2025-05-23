/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

// Make this available to both AMD and CJS environments
define(function (require, exports, module) {
  // Dependencies
  const React = require("resource://devtools/client/shared/vendor/react.mjs");

  /**
   * Create React factories for given arguments.
   * Example:
   *   const {
   *     Tabs,
   *     TabPanel
   *   } = createFactories(ChromeUtils.importESModule("devtools/client/shared/components/tabs/Tabs.mjs"));
   */
  function createFactories(args) {
    const result = {};
    for (const p in args) {
      result[p] = React.createFactory(args[p]);
    }
    return result;
  }

  module.exports = {
    createFactories,
  };
});
