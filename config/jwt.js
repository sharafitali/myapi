const jwt = require("jsonwebtoken");
const config = require("./config");
const jwtAuthMiddleware = async(req, res,next)=>{
    const bearerHeader = req.headers["authorization"]
    if (
        typeof bearerHeader !== "undefined" &&
        bearerHeader.startsWith("bearer")
    ) {
        const accessToken = bearerHeader.split(" ")[1]

        try {
            const decodedaccessToken = jwt.verify(accessToken, config.jwt.secret)
            console.log("Decoded Token:", decodedaccessToken)
            req.user = decodedaccessToken
            req.accessToken = accessToken
            console.log("User:", req.user)
            next()
        } catch (error) {
            console.error(error)
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ error: "Token has expired" })
            }
            return res
                .status(401)
                .json({ error: "Unauthorized: Invalid token" })
        }
    } else {
        res.status(401).json({
            error: "Unauthorized: Token missing or invalid scheme",
        })
    }
}

module.exports ={
    jwtAuthMiddleware
}