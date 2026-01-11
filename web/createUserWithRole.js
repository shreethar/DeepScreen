// Import the Firebase Admin SDK
const admin = require('firebase-admin');

// Path to your service account key file
// Make sure this file is kept secure and not exposed publicly.
const serviceAccount = require('../serviceAccountKey.json');

// Initialize the Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

console.log('Firebase Admin SDK initialized successfully.');

/**
 * Creates a new user in Firebase Authentication and assigns a custom role.
 * @param {string} email The user's email address.
 * @param {string} password The user's password.
 * @param {string} displayName The user's display name.
 * @param {string} role The custom role to assign (e.g., 'admin', 'editor', 'viewer').
 */
async function createUserAndAssignRole(email, password, displayName, phoneNumber, role) {
    try {
        // 1. Create the user
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: displayName,
            phoneNumber: phoneNumber,
            emailVerified: true, // Optionally set email as verified
            disabled: false,     // Optionally enable the user
        });

        console.log(`Successfully created new user: ${userRecord.uid}`);
        console.log(`User Email: ${userRecord.email}`);
        console.log(`User Display Name: ${userRecord.displayName}`);
        console.log(`User Phone Number: ${userRecord.phoneNumber}`);

        // 2. Assign custom claims (role) to the user
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: role
        });

        console.log(`Successfully assigned role '${role}' to user: ${userRecord.uid}`);

        // Optionally, revoke existing ID tokens to force the new claims to take effect immediately
        // The user will need to re-authenticate or their client-side token will refresh automatically
        // within an hour.
        // await admin.auth().revokeRefreshTokens(userRecord.uid);
        // console.log(`Revoked refresh tokens for user: ${userRecord.uid}. User will need to re-authenticate.`);

        console.log('User creation and role assignment complete.');
        return userRecord;

    } catch (error) {
        console.error('Error creating user or assigning role:', error);
        throw error; // Re-throw the error for external handling
    }
}

// --- Example Usage ---
const newUserEmail = 'newuser@example.com';
const newUserPassword = 'strongPassword123!'; // Use a strong password
const newUserDisplayName = 'New User';
const newUserPhoneNumber = '+1234567890'; // Assign a role like 'employer', 'applicant'
const newUserRole = 'applicant';

createUserAndAssignRole(newUserEmail, newUserPassword, newUserDisplayName, newUserPhoneNumber, newUserRole)
    .then(() => {
        console.log('Script finished.');
        process.exit(0); // Exit successfully
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1); // Exit with an error code
    });
