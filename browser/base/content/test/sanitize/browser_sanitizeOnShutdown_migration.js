/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.sanitize.useOldClearHistoryDialog", false]],
  });
});

// Test checking "clear cookies and site data when firefox shuts down" does a migration
// before making any pref changes (Bug 1894933)
add_task(async function testMigrationForDeleteOnClose() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", false],
      ["privacy.sanitize.sanitizeOnShutdown", false],
      ["privacy.clearOnShutdown_v2.cookiesAndStorage", true],
      ["privacy.clearOnShutdown_v2.browsingHistoryAndDownloads", true],
      ["privacy.clearOnShutdown_v2.siteSettings", false],
      ["privacy.clearOnShutdown_v2.cache", false],
    ],
  });

  // open privacy settings
  await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
    leaveOpen: true,
  });

  let document = gBrowser.contentDocument;
  let deleteOnCloseBox = document.getElementById("deleteOnClose");
  ok(!deleteOnCloseBox.checked, "DeleteOnClose initial state is deselected");

  let alwaysClearBox = document.getElementById("alwaysClear");
  ok(!alwaysClearBox.checked, "AlwaysClear initial state is deselected");

  deleteOnCloseBox.click();

  ok(deleteOnCloseBox.checked, "DeleteOnClose is selected");
  is(
    deleteOnCloseBox.checked,
    alwaysClearBox.checked,
    "DeleteOnClose sets alwaysClear in the same state, selected"
  );
  // We are done changing settings in about:preferences, remove the tab
  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  // Open the clear on shutdown preferences dialog
  let dh = new ClearHistoryDialogHelper({ mode: "clearOnShutdown" });
  dh.onload = function () {
    is(
      Services.prefs.getBoolPref(
        "privacy.clearOnShutdown_v2.browsingHistoryAndDownloads"
      ),
      false,
      "History pref should flip to false"
    );
    is(
      Services.prefs.getBoolPref(
        "privacy.clearOnShutdown_v2.cookiesAndStorage"
      ),
      true,
      "Cookies pref should remain true"
    );
    is(
      Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cache"),
      true,
      "Cache pref should flip to true"
    );
    is(
      Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.siteSettings"),
      false,
      "Site settings should remain false"
    );
    this.cancelDialog();
  };
  dh.open();
  await dh.promiseClosed;
});

// Test removal of the old pref privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs
add_task(async function testOldPrefRemoval() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown.history", true],
      ["privacy.clearOnShutdown_v2.browsingHistoryAndDownloads", false],
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", false],
      ["privacy.sanitize.cpd.hasMigratedToNewPrefs3", false],
    ],
  });

  // Add the old prefs to indicate that a migration was done before
  Services.prefs.setBoolPref(
    "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs",
    true
  );
  Services.prefs.setBoolPref(
    "privacy.sanitize.cpd.hasMigratedToNewPrefs",
    true
  );
  Services.prefs.setBoolPref(
    "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs2",
    true
  );
  Services.prefs.setBoolPref(
    "privacy.sanitize.cpd.hasMigratedToNewPrefs2",
    true
  );

  is(
    Services.prefs.getPrefType(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs"
    ),
    Services.prefs.PREF_BOOL,
    "Old migration pref should exist"
  );

  is(
    Services.prefs.getPrefType("privacy.sanitize.cpd.hasMigratedToNewPrefs"),
    Services.prefs.PREF_BOOL,
    "Old migration pref should exist"
  );

  is(
    Services.prefs.getPrefType(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs2"
    ),
    Services.prefs.PREF_BOOL,
    "Old migration pref should exist"
  );

  is(
    Services.prefs.getPrefType("privacy.sanitize.cpd.hasMigratedToNewPrefs2"),
    Services.prefs.PREF_BOOL,
    "Old migration pref should exist"
  );

  Sanitizer.maybeMigratePrefs("clearOnShutdown");

  is(
    Services.prefs.getPrefType(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs"
    ),
    Services.prefs.PREF_INVALID,
    "Old clearonshutdown migration pref should not exist anymore"
  );

  is(
    Services.prefs.getPrefType(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs2"
    ),
    Services.prefs.PREF_BOOL,
    "Old clearonshutdown migration pref should still exist"
  );

  ok(
    Services.prefs.getBoolPref(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3"
    ),
    "Migration should be reflected on new clearonshutdown pref"
  );

  ok(
    Services.prefs.getBoolPref(
      "privacy.clearOnShutdown_v2.browsingHistoryAndDownloads"
    ),
    "History should be flipped to true after migrating"
  );

  Sanitizer.maybeMigratePrefs("cpd");

  is(
    Services.prefs.getPrefType("privacy.sanitize.cpd.hasMigratedToNewPrefs"),
    Services.prefs.PREF_INVALID,
    "old cpd migration pref should not exist anymore"
  );

  is(
    Services.prefs.getPrefType("privacy.sanitize.cpd.hasMigratedToNewPrefs2"),
    Services.prefs.PREF_BOOL,
    "old cpd migration pref should still exist"
  );

  ok(
    Services.prefs.getBoolPref("privacy.sanitize.cpd.hasMigratedToNewPrefs3"),
    "Migration should be reflected on new cpd pref"
  );
});

add_task(async function testMigrationOfCacheAndSiteSettings() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown.cache", true],
      ["privacy.clearOnShutdown.siteSettings", true],
      ["privacy.clearOnShutdown_v2.cache", false],
      ["privacy.clearOnShutdown_v2.siteSettings", false],
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", false],
    ],
  });

  Sanitizer.runSanitizeOnShutdown();

  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cache"),
    "Cache should be set to true"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.siteSettings"),
    "siteSettings should be set to true"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.cache"),
    "old cache should remain true"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.siteSettings"),
    "old siteSettings should remain true"
  );

  ok(
    Services.prefs.getBoolPref(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3"
    ),
    "migration pref has been flipped"
  );
});

add_task(async function testHistoryAndFormData_historyTrue() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown.history", true],
      ["privacy.clearOnShutdown.formdata", false],
      ["privacy.clearOnShutdown_v2.browsingHistoryAndDownloads", false],
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", false],
    ],
  });

  Sanitizer.runSanitizeOnShutdown();

  ok(
    Services.prefs.getBoolPref(
      "privacy.clearOnShutdown_v2.browsingHistoryAndDownloads"
    ),
    "browsingHistoryAndDownloads should be set to true"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.history"),
    "old history pref should remain true"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.formdata"),
    "old formdata pref should remain false"
  );

  ok(
    Services.prefs.getBoolPref(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3"
    ),
    "migration pref has been flipped"
  );
});

add_task(async function testHistoryAndDownloads_historyFalse() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown.history", false],
      ["privacy.clearOnShutdown.formdata", true],
      ["privacy.clearOnShutdown_v2.browsingHistoryAndDownloads", true],
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", false],
    ],
  });

  Sanitizer.runSanitizeOnShutdown();

  ok(
    !Services.prefs.getBoolPref(
      "privacy.clearOnShutdown_v2.browsingHistoryAndDownloads"
    ),
    "browsingHistoryAndDownloads should be set to false"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.history"),
    "old history pref should remain false"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.formdata"),
    "old formdata pref should remain true"
  );

  ok(
    Services.prefs.getBoolPref(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3"
    ),
    "migration pref has been flipped"
  );
});

add_task(async function testFormData_historyFalse() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown_v2.historyFormDataAndDownloads", false],
      ["privacy.clearOnShutdown_v2.formdata", true],
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", false],
    ],
  });

  Sanitizer.runSanitizeOnShutdown();

  ok(
    !Services.prefs.getBoolPref(
      "privacy.clearOnShutdown_v2.historyFormDataAndDownloads"
    ),
    "historyFormDataAndDownloads should still be false"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.formdata"),
    "old history pref should be set to true"
  );

  ok(
    Services.prefs.getBoolPref(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3"
    ),
    "migration pref has been flipped"
  );
});

add_task(async function testCookiesAndStorage_cookiesFalse() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown.cookies", false],
      ["privacy.clearOnShutdown.offlineApps", true],
      ["privacy.clearOnShutdown.sessions", true],
      ["privacy.clearOnShutdown_v2.cookiesAndStorage", true],
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", false],
    ],
  });

  // Simulate clearing on shutdown.
  Sanitizer.runSanitizeOnShutdown();

  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cookiesAndStorage"),
    "cookiesAndStorage should be set to false"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.cookies"),
    "old cookies pref should remain false"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.offlineApps"),
    "old offlineApps pref should remain true"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.sessions"),
    "old sessions pref should remain true"
  );

  ok(
    Services.prefs.getBoolPref(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3"
    ),
    "migration pref has been flipped"
  );
});

add_task(async function testCookiesAndStorage_cookiesTrue() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown.cookies", true],
      ["privacy.clearOnShutdown.offlineApps", false],
      ["privacy.clearOnShutdown.sessions", false],
      ["privacy.clearOnShutdown_v2.cookiesAndStorage", false],
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", false],
    ],
  });

  Sanitizer.runSanitizeOnShutdown();

  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cookiesAndStorage"),
    "cookiesAndStorage should be set to true"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.cookies"),
    "old cookies pref should remain true"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.offlineApps"),
    "old offlineApps pref should remain false"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.sessions"),
    "old sessions pref should remain false"
  );

  ok(
    Services.prefs.getBoolPref(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3"
    ),
    "migration pref has been flipped"
  );
});

add_task(async function testMigrationDoesNotRepeat() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown.cookies", true],
      ["privacy.clearOnShutdown.offlineApps", false],
      ["privacy.clearOnShutdown.sessions", false],
      ["privacy.clearOnShutdown_v2.cookiesAndStorage", false],
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", true],
    ],
  });

  // Simulate clearing on shutdown.
  Sanitizer.runSanitizeOnShutdown();

  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cookiesAndStorage"),
    "cookiesAndStorage should remain false"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.cookies"),
    "old cookies pref should remain true"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.offlineApps"),
    "old offlineApps pref should remain false"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.sessions"),
    "old sessions pref should remain false"
  );

  ok(
    Services.prefs.getBoolPref(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3"
    ),
    "migration pref has been flipped"
  );
});

add_task(async function ensureNoOldPrefsAreEffectedByMigration() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown.history", true],
      ["privacy.clearOnShutdown.formdata", true],
      ["privacy.clearOnShutdown.cookies", true],
      ["privacy.clearOnShutdown.offlineApps", false],
      ["privacy.clearOnShutdown.sessions", false],
      ["privacy.clearOnShutdown.siteSettings", true],
      ["privacy.clearOnShutdown.cache", true],
      ["privacy.clearOnShutdown_v2.cookiesAndStorage", false],
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", false],
    ],
  });

  Sanitizer.runSanitizeOnShutdown();

  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cookiesAndStorage"),
    "cookiesAndStorage should become true"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.cookies"),
    "old cookies pref should remain true"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.offlineApps"),
    "old offlineApps pref should remain false"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.sessions"),
    "old sessions pref should remain false"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.history"),
    "old history pref should remain true"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.formdata"),
    "old formdata pref should remain true"
  );
});

add_task(async function ensureOldPrefsTrueDontInfluenceV2ToV3Migration() {
  // Verify that no true value from v1 prefs spill over to v2 prefs when
  // hasMigratedToNewPrefs2 migration already happend.
  await SpecialPowers.pushPrefEnv({
    set: [
      // v1 prefs
      ["privacy.clearOnShutdown.history", true],
      ["privacy.clearOnShutdown.formdata", true],
      ["privacy.clearOnShutdown.cookies", true],
      ["privacy.clearOnShutdown.offlineApps", true],
      ["privacy.clearOnShutdown.sessions", true],
      ["privacy.clearOnShutdown.siteSettings", true],
      ["privacy.clearOnShutdown.cache", true],
      // v2 prefs
      ["privacy.clearOnShutdown_v2.historyFormDataAndDownloads", false],
      // shared v2 and v3 prefs
      ["privacy.clearOnShutdown_v2.cache", false],
      ["privacy.clearOnShutdown_v2.cookiesAndStorage", false],
      ["privacy.clearOnShutdown_v2.siteSettings", false],
      // v3 prefs
      ["privacy.clearOnShutdown_v2.formdata", true],
      ["privacy.clearOnShutdown_v2.browsingHistoryAndDownloads", true],

      // migration state prefs
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs2", true],
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", false],
    ],
  });

  Sanitizer.runSanitizeOnShutdown();

  // verify that unmigrated prefs are unaffected
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cache"),
    "cache shouldn't be migrated v2 to v3"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cookiesAndStorage"),
    "cookiesAndStorage shouldn't be migrated v2 to v3"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.siteSettings"),
    "cookiesAndStorage shouldn't be migrated v2 to v3"
  );
  // verify that v3 prefs got migrated
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.formdata"),
    "formdata should be migrated from v2 pref"
  );
  ok(
    !Services.prefs.getBoolPref(
      "privacy.clearOnShutdown_v2.browsingHistoryAndDownloads"
    ),
    "browsingHistoryAndDownloads should be migrated from v2 pref"
  );
  ok(
    Services.prefs.getBoolPref(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3"
    ),
    "migration to v3 ran"
  );
});

add_task(async function ensureOldPrefsFalseDontInfluenceV2ToV3Migration() {
  // Verify that no false value from v1 prefs spill over to v2 prefs when
  // hasMigratedToNewPrefs2 migration already happend.
  await SpecialPowers.pushPrefEnv({
    set: [
      // v1 prefs
      ["privacy.clearOnShutdown.history", false],
      ["privacy.clearOnShutdown.formdata", false],
      ["privacy.clearOnShutdown.cookies", false],
      ["privacy.clearOnShutdown.offlineApps", false],
      ["privacy.clearOnShutdown.sessions", false],
      ["privacy.clearOnShutdown.siteSettings", false],
      ["privacy.clearOnShutdown.cache", false],
      // v2 prefs
      ["privacy.clearOnShutdown_v2.historyFormDataAndDownloads", true],
      // shared v2 and v3 prefs
      ["privacy.clearOnShutdown_v2.cache", true],
      ["privacy.clearOnShutdown_v2.cookiesAndStorage", true],
      ["privacy.clearOnShutdown_v2.siteSettings", true],
      // v3 prefs
      ["privacy.clearOnShutdown_v2.formdata", false],
      ["privacy.clearOnShutdown_v2.browsingHistoryAndDownloads", false],

      // migration state prefs
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs2", true],
      ["privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3", false],
    ],
  });

  Sanitizer.runSanitizeOnShutdown();

  // verify that unmigrated prefs are unaffected
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cache"),
    "cache shouldn't be migrated v2 to v3"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cookiesAndStorage"),
    "cookiesAndStorage shouldn't be migrated v2 to v3"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.siteSettings"),
    "cookiesAndStorage shouldn't be migrated v2 to v3"
  );
  // verify that v3 prefs got migrated
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.formdata"),
    "formdata should be migrated from v2 pref"
  );
  ok(
    Services.prefs.getBoolPref(
      "privacy.clearOnShutdown_v2.browsingHistoryAndDownloads"
    ),
    "browsingHistoryAndDownloads should be migrated from v2 pref"
  );

  ok(
    Services.prefs.getBoolPref(
      "privacy.sanitize.clearOnShutdown.hasMigratedToNewPrefs3"
    ),
    "migration to v3 ran"
  );
});
