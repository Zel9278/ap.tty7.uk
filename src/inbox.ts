import crypto from "crypto"
import { Context } from "hono"
import { database } from "."
import { Users, RemoteUsers } from "./database/tables"
import { eq } from "drizzle-orm"
import { getInbox, acceptFollow, createNote, deleteNote } from "./logic"
import { importprivateKey } from "./utils"

export const userInboxHandler = async (c: Context) => {
    const json = await c.req.json()

    if (!json) {
        if (json.type !== "Follow" && json.type !== "Undo") {
            return c.text("Bad Request", 400)
        }
        return c.text("Bad Request", 400)
    }

    const strName = c.req.param("strName")
    const strHost = new URL(c.req.url).hostname
    const contentType = c.req.header("Content-Type") || ""

    if (strName !== c.env.preferredUsername) return c.notFound()
    if (!contentType.includes("application/activity+json"))
        return c.body(null, 400)
    const y = await c.req.json()
    if (new URL(y.actor).protocol !== "https:") return c.body(null, 400)

    const x = await getInbox(y.actor)
    if (!x) return c.body(null, 500)

    const user = await database
        .select()
        .from(Users)
        .where(eq(Users.username, strName))
        .execute()
    if (user.length === 0) return c.body(null, 404)

    const privateKey = await importprivateKey(user[0].privatekey)

    if (y.type === "Follow") {
        const actor = y.actor
        await database.insert(RemoteUsers).values({
            id: Math.random().toString(36).slice(2),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            username: y.username,
            name: y.name || "",
            host: new URL(actor).host,
            icon_url: y.icon_url || "",
            image_url: y.image_url || "",
            summary: y.summary || "",
        })
        await acceptFollow(strName, strHost, x, y, privateKey)
        return c.body(null)
    }

    if (y.type === "Undo") {
        const z = y.object
        if (z.type === "Follow") {
            await c.env.DB.prepare(`DELETE FROM follower WHERE id = ?;`)
                .bind(y.actor)
                .run()
            return c.body(null)
        }
    }

    return c.body(null, 500)
}

export const inboxHandler = async (c: Context) => {
    const body = await c.req.json()

    if (!body) {
        return c.text("Bad Request", 400)
    }

    console.log(body)

    return c.text("OK")
}
