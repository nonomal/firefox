/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Base preferences file used by performance harnesses
/* globals user_pref */
user_pref("app.normandy.api_url", "https://127.0.0.1/selfsupport-dummy/");
user_pref("browser.EULA.override", true);
user_pref("browser.addon-watch.interval", -1); // Deactivate add-on watching
// Disable Bookmark backups by default.
user_pref("browser.bookmarks.max_backups", 0);
user_pref("browser.cache.disk.smart_size.enabled", false);
user_pref("browser.contentHandlers.types.0.uri", "http://127.0.0.1/rss?url=%s");
user_pref("browser.contentHandlers.types.1.uri", "http://127.0.0.1/rss?url=%s");
user_pref("browser.contentHandlers.types.2.uri", "http://127.0.0.1/rss?url=%s");
user_pref("browser.contentHandlers.types.3.uri", "http://127.0.0.1/rss?url=%s");
user_pref("browser.contentHandlers.types.4.uri", "http://127.0.0.1/rss?url=%s");
user_pref("browser.contentHandlers.types.5.uri", "http://127.0.0.1/rss?url=%s");
user_pref("browser.link.open_newwindow", 2);
user_pref("browser.newtabpage.activity-stream.default.sites", "");
user_pref("browser.newtabpage.activity-stream.telemetry", false);
// Don't load or render cfrs by default
user_pref("browser.newtabpage.activity-stream.asrouter.userprefs.cfr.features", false);
user_pref("browser.newtabpage.activity-stream.asrouter.userprefs.cfr.addons", false);
user_pref("browser.reader.detectedFirstArticle", true);
user_pref("browser.safebrowsing.blockedURIs.enabled", false);
user_pref("browser.safebrowsing.downloads.enabled", false);
user_pref("browser.safebrowsing.downloads.remote.url", "http://127.0.0.1/safebrowsing-dummy/downloads");
user_pref("browser.safebrowsing.malware.enabled", false);
user_pref("browser.safebrowsing.phishing.enabled", false);
user_pref("browser.safebrowsing.provider.google.gethashURL", "http://127.0.0.1/safebrowsing-dummy/gethash");
user_pref("browser.safebrowsing.provider.google.updateURL", "http://127.0.0.1/safebrowsing-dummy/update");
user_pref("browser.safebrowsing.provider.google4.gethashURL", "http://127.0.0.1/safebrowsing4-dummy/gethash");
user_pref("browser.safebrowsing.provider.google4.updateURL", "http://127.0.0.1/safebrowsing4-dummy/update");
user_pref("browser.safebrowsing.provider.mozilla.gethashURL", "http://127.0.0.1/safebrowsing-dummy/gethash");
user_pref("browser.safebrowsing.provider.mozilla.updateURL", "http://127.0.0.1/safebrowsing-dummy/update");
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.warnOnQuit", false);
user_pref("datareporting.healthreport.documentServerURI", "http://127.0.0.1/healthreport/");
user_pref("devtools.chrome.enabled", false);
user_pref("devtools.debugger.remote-enabled", false);
user_pref("devtools.theme", "light");
user_pref("devtools.timeline.enabled", false);
user_pref("dom.allow_scripts_to_close_windows", true);
user_pref("dom.disable_open_during_load", false);
user_pref("dom.disable_window_flip", true);
user_pref("dom.disable_window_move_resize", true);
// required to prevent non-local access to push.services.mozilla.com
user_pref("dom.push.connection.enabled", false);
user_pref("extensions.autoDisableScopes", 10);
user_pref("extensions.blocklist.enabled", false);
user_pref("extensions.checkCompatibility", false);
user_pref("extensions.getAddons.get.url", "http://127.0.0.1/extensions-dummy/repositoryGetURL");
user_pref("extensions.getAddons.search.browseURL", "http://127.0.0.1/extensions-dummy/repositoryBrowseURL");
user_pref("extensions.hotfix.url", "http://127.0.0.1/extensions-dummy/hotfixURL");
user_pref("extensions.systemAddon.update.url", "http://127.0.0.1/dummy-system-addons.xml");
user_pref("extensions.update.background.url", "http://127.0.0.1/extensions-dummy/updateBackgroundURL");
user_pref("extensions.update.notifyUser", false);
user_pref("extensions.update.url", "http://127.0.0.1/extensions-dummy/updateURL");
user_pref("identity.fxaccounts.auth.uri", "https://127.0.0.1/fxa-dummy/");
user_pref("identity.fxaccounts.migrateToDevEdition", false);
user_pref("media.capturestream_hints.enabled", true);
user_pref("media.gmp-manager.url", "http://127.0.0.1/gmpmanager-dummy/update.xml");
// Don't block old libavcodec libraries when testing, because our test systems
// cannot easily be upgraded.
user_pref("media.libavcodec.allow-obsolete", true);
user_pref("media.navigator.enabled", true);
user_pref("media.navigator.permission.disabled", true);
user_pref("media.peerconnection.enabled", true);
// Set places maintenance far in the future (the maximum time possible in an
// int32_t) to avoid it kicking in during tests. The maintenance can take a
// relatively long time which may cause unnecessary intermittents and slow down
// tests. This, like many things, will stop working correctly in 2038.
user_pref("places.database.lastMaintenance", 2147483647);
user_pref("privacy.reduceTimerPrecision", false); // Bug 1445243 - reduces precision of tests
user_pref("privacy.trackingprotection.annotate_channels", false);
user_pref("privacy.trackingprotection.enabled", false);
user_pref("privacy.trackingprotection.introURL", "http://127.0.0.1/trackingprotection/tour");
user_pref("privacy.trackingprotection.pbmode.enabled", false);
user_pref("security.enable_java", false);
user_pref("network.protocol-handler.external.ext+damp", true);
user_pref("network.protocol-handler.external.ext+twinopen", true);
user_pref("security.fileuri.strict_origin_policy", false);
user_pref("toolkit.telemetry.server", "https://127.0.0.1/telemetry-dummy/");
// Default Glean to "record but don't report" mode, and to never trigger
// activity-based ping submission. Docs:
// https://firefox-source-docs.mozilla.org/toolkit/components/glean/dev/preferences.html
user_pref("telemetry.fog.test.localhost_port", -1);
user_pref("telemetry.fog.test.activity_limit", -1);
user_pref("telemetry.fog.test.inactivity_limit", -1);
// The telemetry system sometimes uses a separate program to send telemetry
// pings, particularly in the case when Firefox is shutting down. The prefs above
// prevent telemetry from being sent anywhere useful, but even so the process would
// still be launched. Because performance tests start and stop the browser in rapid
// succession, the pingsender calls from the previous test can run simultaneously with
// the next test, increasing the system resource load and skewing the
// results. So we just silently skip the pingsender invocation during perf tests.
user_pref("toolkit.telemetry.testing.suppressPingsender", true);
user_pref("startup.homepage_welcome_url", "");
user_pref("startup.homepage_welcome_url.additional", "");
// Ensures that system principal triggered about:blank load within the current
// process to avoid performing process switches in the middle of warm load
// tests (bug 1725270). Can be removed once non-about:blank intermediate pages
// are used instead (bug 1724261).
user_pref("browser.tabs.remote.systemTriggeredAboutBlankAnywhere", true);
// Make sure speech dispatcher notification error does not impact how we measure visual perception in raptor tests
user_pref("media.webspeech.synth.dont_notify_on_error", true);
// Turn off update
user_pref("app.update.disabledForTesting", true);
