import jwt from "jsonwebtoken"

export function tokenGenerator(payload: any){
    const { NODE_ENV, TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env
    const token = jwt.sign(payload, TOKEN_SECRET as string, {
        expiresIn: NODE_ENV === "development" ? "1m" : "7d"
    })
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET as string, {
        expiresIn: NODE_ENV === "development" ? "5m" : "30d"
    })
    return { 
        token: token,
        refreshToken: refreshToken
    }
}