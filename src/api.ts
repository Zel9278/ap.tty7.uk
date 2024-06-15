import { Hono } from "hono"
import { getCookie } from "hono/cookie"
import { database } from "."
import { Users } from "./database/tables"

const api = new Hono()

// post api
api.post("/v1/grow", async (c) => {
    if (!c.req.header("Content-Type")?.includes("application/json")) {
        return c.text("Bad Request", 400)
    }

    const cookieToken = getCookie(c, "token")
    const headerToken =
        c.req.header("Authorization")?.split(" ")[0] === "Bearer"
            ? c.req.header("Authorization")?.split(" ")[1]
            : null
    const token = cookieToken || headerToken

    if (!token) {
        return c.text("Unauthorized, no token", 401)
    }

    const users = database.select().from(Users).all()
    const user = users.find((u) => {
        return u.token?.split(",").includes(token)
    })

    if (!user) {
        return c.text("Unauthorized, invalid token", 401)
    }

    const body = await c.req.json()
    console.log(body)

    return c.text("OK")
})

export default api
