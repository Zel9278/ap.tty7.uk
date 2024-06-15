import { Hono } from "hono"
import actor from "./actor"
import accepts from "./accepts"
import { userInboxHandler } from "./inbox"

const me = new Hono()

me.get("/", async (c) => {
    const accept = c.req.header("Accept")?.match(/[^,; ]+/g) || []

    if (accept.some((a) => accepts.includes(a))) {
        return c.json(await actor("c30"), 200, {
            "Content-Type": "application/activity+json",
        })
    }

    return c.text("@c30@ap.tty7.uk")
})

me.post("/inbox", userInboxHandler)

me.get("/outbox", async (c) => {
    const body = await c.req.parseBody()
    console.log(body)

    return c.text("OK")
})

me.get("/followers", async (c) => {
    const body = await c.req.parseBody()
    console.log(body)

    return c.text("OK")
})

me.get("/following", async (c) => {
    const body = await c.req.parseBody()
    console.log(body)

    return c.text("OK")
})

export default me
