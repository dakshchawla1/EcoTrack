const adminAuth = require("../firebase-admin");


const verifyToken = async (req, res, next) => {

    try {

        /*
            Get Authorization header
        */

        const authHeader =
            req.headers.authorization;


        /*
            Check whether token exists
        */

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                message:
                    "Unauthorized: Firebase token required"
            });

        }


        /*
            Extract token

            Header looks like:

            Bearer eyJhbGciOi...
        */

        const token =
            authHeader.split("Bearer ")[1];


        /*
            Verify token using Firebase Admin
        */

        const decodedToken =
            await adminAuth.verifyIdToken(
                token
            );


        /*
            Firebase gives us the
            verified user's UID.

            We trust this UID because
            Firebase verified the token.
        */

        req.user = decodedToken;


        /*
            Continue to the API route
        */

        next();


    } catch (error) {

        console.error(
            "Firebase authentication error:",
            error.message
        );


        return res.status(401).json({
            message:
                "Unauthorized: Invalid Firebase token"
        });

    }

};


module.exports = verifyToken;