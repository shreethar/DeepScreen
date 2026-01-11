// Assuming you have input fields for email and password in your HTML
// For example:
// <input type="email" id="emailInput" placeholder="Email">
// <input type="password" id="passwordInput" placeholder="Password">
// <button id="signInButton">Sign In</button>

const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signInButton = document.getElementById('signInButton');

signInButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Signed in successfully
        const user = userCredential.user;
        console.log("User signed in:", user);

        // You can now access user information, including custom claims
        const idTokenResult = await user.getIdTokenResult();
        console.log("Custom Claims:", idTokenResult.claims);

        // Example: Check for a 'role' claim
        if (idTokenResult.claims.role === 'admin') {
            console.log("User is an admin!");
            // Redirect to admin dashboard or enable admin features
        } else if (idTokenResult.claims.role === 'editor') {
            console.log("User is an editor!");
            // Redirect to editor dashboard or enable editor features
        } else {
            console.log("User has a different role or no role specified.");
            // Redirect to regular user dashboard
        }

        // Perform actions after successful sign-in, e.g., redirect to a dashboard
        alert("Successfully signed in!");

    } catch (error) {
        // Handle errors here
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Error signing in:", errorCode, errorMessage);
        alert(`Sign-in failed: ${errorMessage}`);

        // Specific error handling examples:
        if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
            // Display a message like "Invalid email or password"
        } else if (errorCode === 'auth/invalid-email') {
            // Display a message like "Please enter a valid email address"
        }
    }
});
