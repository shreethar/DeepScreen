import "server-only"
import admin from "firebase-admin"
import { getApps } from "firebase-admin/app"

// Adjusted path to go up two levels from `web/lib` to `Workshop2` then into `serviceAccountKey.json`?
// The user said: `const serviceAccount = require('../serviceAccountKey.json');` in `web/createUserWithRole.js`.
// So the key is in `web/serviceAccountKey.json` relative to `createUserWithRole.js`.
// `createUserWithRole.js` is in `web/`.
// So `../serviceAccountKey.json` would mean it's in `Workshop2/`.
// But wait, `require('../serviceAccountKey.json')` from `c:/Users/rshre/Workshop2/web/createUserWithRole.js`
// would look in `c:/Users/rshre/Workshop2/serviceAccountKey.json`.
// Let's assume the key is at `c:/Users/rshre/Workshop2/serviceAccountKey.json`.

// However, implementing this in `lib/firebase-admin.ts` which will be compiled/bundled might be tricky with relative paths if looking outside `web` in Next.js.
// But let's try to just require it from the absolute path or relative to project root if Next.js allows.
// Actually, `serviceAccountKey.json` usually contains secrets.
// A better way is to use environment variables, but the user explicitly pointed to the file.
// Let's try to import it.

const serviceAccount = require("../../serviceAccountKey.json")

if (!getApps().length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    })
}

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()
