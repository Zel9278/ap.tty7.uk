import { serve } from "@hono/node-server"
import { Hono } from "hono"
import actor from "./actor"
import accepts from "./accepts"

const PORT = 7634

const app = new Hono()

app.use((c, next) => {
    console.log(c.req.method, c.req.url, c.req.header())
    return next()
})

app.get("/", (c) => {
    return c.text("Hello Hono!")
})

app.get("/actor", (c) => {
    const accept = c.req.header("Accept")?.match(/[^,; ]+/g) || []
    const resource = decodeURI(c.req.query("resource") || "")

    if (!accept.some((a) => accepts.includes(a))) {
        c.text("Not Acceptable", 406, {
            "Content-Type": "application/activity+json",
        })
    }

    if (resource === actor.id) {
        return c.json(actor, 200, {
            "Content-Type": "application/activity+json",
        })
    } else {
        return c.text("Not Found", 404, {
            "Content-Type": "application/activity+json",
        })
    }
})

console.log(`Server is running on port ${PORT}`)
console.log(actor)

serve({
    fetch: app.fetch,
    port: PORT,
})
