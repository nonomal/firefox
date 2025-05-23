/*
 * NSS utility functions
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "prtypes.h"
#include "prinit.h"
#include "nss.h"
#include "seccomon.h"
#include "secerr.h"
#include "ssl.h"
#include "sslimpl.h"
#include "sslproto.h"

static PRCallOnceType ssl_init = { 0 };
PR_STATIC_ASSERT(sizeof(unsigned long) <= sizeof(PRUint64));

static SECStatus
ssl_InitShutdown(void *appData, void *nssData)
{
    memset(&ssl_init, 0, sizeof(ssl_init));
    return SECSuccess;
}

PRStatus
ssl_InitCallOnce(void *arg)
{
    int *error = (int *)arg;
    SECStatus rv;

    rv = ssl_InitializePRErrorTable();
    if (rv != SECSuccess) {
        *error = SEC_ERROR_NO_MEMORY;
        return PR_FAILURE;
    }
#ifdef DEBUG
    ssl3_CheckCipherSuiteOrderConsistency();
#endif

    rv = ssl3_ApplyNSSPolicy();
    if (rv != SECSuccess) {
        *error = PORT_GetError();
        return PR_FAILURE;
    }

    rv = NSS_RegisterShutdown(ssl_InitShutdown, NULL);
    if (rv != SECSuccess) {
        *error = PORT_GetError();
        return PR_FAILURE;
    }
    return PR_SUCCESS;
}

SECStatus
ssl_Init(void)
{
    int error;
    PRStatus nrv = PR_CallOnceWithArg(&ssl_init, ssl_InitCallOnce, &error);
    if (nrv != PR_SUCCESS) {
        PORT_SetError(error);
        return SECFailure;
    }
    return SECSuccess;
}
