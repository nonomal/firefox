/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

/**
 * This test is mainly to verify that initializeTemporaryClient() does call
 * QuotaManager::EnsureTemporaryClientIsInitialized() which ensures client
 * directory existence.
 */

async function testSteps() {
  const clientMetadata = {
    persistence: "default",
    principal: getPrincipal("https://foo.example.com"),
    client: "sdb",
    file: getRelativeFile("storage/default/https+++foo.example.com/sdb"),
  };

  info("Clearing");

  let request = clear();
  await requestFinished(request);

  info("Initializing");

  request = init();
  await requestFinished(request);

  info("Initializing temporary storage");

  request = initTemporaryStorage();
  await requestFinished(request);

  info("Initializing temporary client");

  request = initTemporaryClient(
    clientMetadata.persistence,
    clientMetadata.principal,
    clientMetadata.client,
    /* createIfNonExistent */ true
  );

  try {
    await requestFinished(request);
    ok(false, "Should have thrown");
  } catch (e) {
    ok(true, "Should have thrown");
    Assert.strictEqual(
      e.resultCode,
      Cr.NS_ERROR_DOM_QM_CLIENT_INIT_ORIGIN_UNINITIALIZED,
      "Threw right result code"
    );
  }

  ok(!clientMetadata.file.exists(), "Client directory does not exist");

  info("Initializing temporary origin");

  request = initTemporaryOrigin(
    clientMetadata.persistence,
    clientMetadata.principal
  );
  await requestFinished(request);

  ok(!clientMetadata.file.exists(), "Client directory does not exist");

  info("Initializing temporary client");

  request = initTemporaryClient(
    clientMetadata.persistence,
    clientMetadata.principal,
    clientMetadata.client,
    /* createIfNonExistent */ true
  );
  await requestFinished(request);

  ok(clientMetadata.file.exists(), "Client directory does exist");
}
