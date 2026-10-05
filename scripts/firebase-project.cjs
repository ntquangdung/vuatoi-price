// Project setup uses the Firebase CLI account; no service-account key is stored.
const {
  getProjectDefaultAccount,
  getAccessToken,
} = require("firebase-tools/lib/auth");
const scopes = require("firebase-tools/lib/scopes");
const project = "vuatoi-price";
const account = getProjectDefaultAccount(process.cwd());
async function main() {
  if (!account || account.user.email !== "cmavuatoilyson@gmail.com")
    throw new Error("Sign in to Firebase CLI as the project owner first.");
  const token = await getAccessToken(account.tokens.refresh_token, [
    scopes.CLOUD_PLATFORM,
    scopes.FIREBASE_PLATFORM,
    scopes.EMAIL,
    scopes.OPENID,
  ]);
  async function api(url, method = "GET", body) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = response.status === 204 ? {} : await response.json();
    if (!response.ok)
      throw new Error(
        `${method} failed (${response.status}): ${data.error?.message}`,
      );
    return data;
  }
  if (process.argv.includes("--domain")) {
    const base = `https://firebasehosting.googleapis.com/v1beta1/projects/${project}/sites/${project}/customDomains`;
    const response = await fetch(`${base}/price.vuatoi.com.vn`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (response.status === 404)
      console.log(
        JSON.stringify(
          await api(`${base}?customDomainId=price.vuatoi.com.vn`, "POST", {}),
          null,
          2,
        ),
      );
    else if (response.ok)
      console.log(JSON.stringify(await response.json(), null, 2));
    else throw new Error(`Custom domain check failed: ${response.status}`);
    return;
  }
  const configUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`;
  const config = await api(configUrl);
  console.log("Authorized domains:", config.authorizedDomains);
  if (process.argv.includes("--add-vercel-domain")) {
    const domain = "vuatoi-price.vercel.app";
    if (config.authorizedDomains?.includes(domain)) {
      console.log(`${domain} already authorized.`);
    } else {
      await api(`${configUrl}?updateMask=authorizedDomains`, "PATCH", {
        authorizedDomains: [...(config.authorizedDomains || []), domain],
      });
      console.log(`${domain} authorized.`);
    }
    return;
  }
  if (process.argv.includes("--apply")) {
    const authorizedDomains = [
      ...new Set([
        ...(config.authorizedDomains || []),
        "localhost",
        "127.0.0.1",
        "price.vuatoi.com.vn",
        "vuatoi-price.web.app",
        "vuatoi-price.firebaseapp.com",
        "vuatoi-price--review-jpsyrv9r.web.app",
      ]),
    ];
    await api(`${configUrl}?updateMask=authorizedDomains`, "PATCH", {
      authorizedDomains,
    });
    console.log("Authorized domains configured.");
    const name = `projects/${project}/databases/(default)/documents/admins/cmavuatoilyson@gmail.com`;
    const url = `https://firestore.googleapis.com/v1/${name}`;
    // createDocument fails if already present; never overwrite or reactivate existing access.
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (response.status === 404) {
      await api(
        `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:commit`,
        "POST",
        {
          writes: [
            {
              update: {
                name,
                fields: {
                  email: { stringValue: "cmavuatoilyson@gmail.com" },
                  active: { booleanValue: true },
                },
              },
              updateTransforms: [
                { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
              ],
              currentDocument: { exists: false },
            },
          ],
        },
      );
      console.log("Initial admin seeded: cmavuatoilyson@gmail.com");
    } else if (response.ok)
      console.log("Initial admin already exists; left unchanged.");
    else throw new Error(`Admin lookup failed: ${response.status}`);
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
