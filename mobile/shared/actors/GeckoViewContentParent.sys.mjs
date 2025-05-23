/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewUtils } from "resource://gre/modules/GeckoViewUtils.sys.mjs";
import { GeckoViewActorParent } from "resource://gre/modules/GeckoViewActorParent.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SessionHistory: "resource://gre/modules/sessionstore/SessionHistory.sys.mjs",
  SessionStoreHelper:
    "resource://gre/modules/sessionstore/SessionStoreHelper.sys.mjs",
});

const { debug, warn } = GeckoViewUtils.initLogging("GeckoViewContentParent");

export class GeckoViewContentParent extends GeckoViewActorParent {
  didDestroy() {
    this._didDestroy = true;
  }

  async collectState() {
    return this.sendQuery("CollectSessionState");
  }

  async containsFormData() {
    return this.sendQuery("ContainsFormData");
  }

  restoreState({ history, switchId, formdata, scrolldata }) {
    if (Services.appinfo.sessionHistoryInParent) {
      const { browsingContext } = this.browser;
      lazy.SessionHistory.restoreFromParent(
        browsingContext.sessionHistory,
        history
      );

      // TODO Bug 1648158 this should include scroll, form history, etc
      return SessionStoreUtils.initializeRestore(
        browsingContext,
        lazy.SessionStoreHelper.buildRestoreData(formdata, scrolldata)
      );
    }

    // Restoring is made of two parts. First we need to restore the history
    // of the tab and navigating to the current page, after the page
    // navigates to the current page we need to restore the state of the
    // page (scroll position, form data, etc).
    //
    // We can't do everything in one step inside the child actor because
    // the actor is recreated when navigating, so we need to keep the state
    // on the parent side until we navigate.
    this.sendAsyncMessage("RestoreHistoryAndNavigate", {
      history,
      switchId,
    });

    if (!formdata && !scrolldata) {
      return null;
    }

    const progressFilter = Cc[
      "@mozilla.org/appshell/component/browser-status-filter;1"
    ].createInstance(Ci.nsIWebProgress);

    const { browser } = this;
    const progressListener = {
      QueryInterface: ChromeUtils.generateQI(["nsIWebProgressListener"]),

      onLocationChange(aWebProgress) {
        if (!aWebProgress.isTopLevel) {
          return;
        }
        // The actor might get recreated between navigations so we need to
        // query it again for the up-to-date instance.
        browser.browsingContext.currentWindowGlobal
          .getActor("GeckoViewContent")
          .sendAsyncMessage("RestoreSessionState", { formdata, scrolldata });
        progressFilter.removeProgressListener(this);
        browser.removeProgressListener(progressFilter);
      },
    };

    const flags = Ci.nsIWebProgress.NOTIFY_LOCATION;
    progressFilter.addProgressListener(progressListener, flags);
    browser.addProgressListener(progressFilter, flags);
    return null;
  }

  // This is a copy of browser/actors/DOMFullscreenParent.sys.mjs
  hasBeenDestroyed() {
    if (this._didDestroy) {
      return true;
    }

    // The 'didDestroy' callback is not always getting called.
    // So we can't rely on it here. Instead, we will try to access
    // the browsing context to judge wether the actor has
    // been destroyed or not.
    try {
      return !this.browsingContext;
    } catch {
      return true;
    }
  }
}
