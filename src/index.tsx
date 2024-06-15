import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono, MiddlewareHandler } from "hono"
import { setCookie, getCookie, deleteCookie } from "hono/cookie"
import { poweredBy } from "hono/powered-by"
import { eq, or } from "drizzle-orm"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import SQLite3 from "better-sqlite3"
import bcrypt from "bcrypt"
import path from "path"

import actor from "./actor"
import accepts from "./accepts"
import wellKnown from "./well-known"
import nodeInfo from "./node-info"
import me from "./me"
import api from "./api"
import { Users } from "./database/tables"
import manifest from "./manifest"
import { inboxHandler } from "./inbox"

import { renderer } from "./frontend/renderer"
import Home from "./frontend/home"
import Login from "./frontend/login"
import { Logined } from "./frontend/logined"

const PORT = 7634

const app = new Hono()
const sqlite = new SQLite3("./src/data/database.db")
const inMemorySQLite = new SQLite3(":memory:")
const db: BetterSQLite3Database = drizzle(sqlite)
const inMemoryDB: BetterSQLite3Database = drizzle(inMemorySQLite)

export { db as database, inMemoryDB as inMemoryDatabase }

/* db migration test */

migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
})

/* db migration test end */

app.use(poweredBy())
app.use("*", async (c, next) => {
    const time = new Date()

    await next()

    const diff = new Date().getTime() - time.getTime()
    const url = c.req.url
    const userAgent = c.req.header("User-Agent")
    const method = c.req.method
    const status = c.res.status

    console.log(`${method}(${status}) ${url} - ${diff}ms | ${userAgent}`)
})
app.use("*", renderer)

const staticOptions = {
    root: "./src",
}

app.use("/resources/*", serveStatic(staticOptions))
app.use("/favicon.ico", serveStatic(staticOptions))

app.route("/.well-known", wellKnown)
app.route("/nodeinfo", nodeInfo)
app.route("/api", api)
app.route("/me", me)

app.get("/", async (c) => {
    const cookie = getCookie(c, "token") || ""
    const users = db.select().from(Users).all()
    const user = users.find((u) => {
        return u.token?.split(",").includes(cookie)
    })

    if (!user) {
        return c.render(Home, {
            title: "Home",
        })
    }

    const token = user?.token?.split(",") || []

    const messages = [
        {
            name: "Taro",
            username: "taro",
            content: "Hello, World!",
            isMe: false,
        },
        {
            name: "Hana",
            username: "hana",
            content: "This is using Hono",
            isMe: false,
        },
        {
            name: "me",
            username: "me",
            content: "That's me!",
            isMe: true,
        },
    ]

    if (token.includes(cookie)) {
        return c.render(<Logined messages={messages} />, {
            title: "Home",
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                summary: user.summary,
                email: user.email,
                icon_url: user.icon_url,
                image_url: user.image_url,
                created_at: user.created_at,
                updated_at: user.updated_at,
            },
        })
    }

    return c.render(Home, {
        title: "Home",
    })
})

app.get("/login", async (c) => {
    const cookie = getCookie(c, "token") || ""
    const user = await db
        .select()
        .from(Users)
        .where(eq(Users.token, cookie))
        .execute()
    const tokens = user[0]?.token?.split(",") || []

    if (tokens.includes(cookie)) {
        return c.redirect("/")
    }

    return c.render(Login, {
        title: "Login",
    })
})

app.get("/logout", async (c) => {
    const token = getCookie(c, "token")

    if (!token) {
        return c.redirect("/")
    }

    const users = db.select().from(Users).all()

    const user = users.find((u) => u.token?.split(",").includes(token))
    const tokens = user?.token?.split(",") || []
    tokens.splice(tokens.indexOf(token), 1)
    await db
        .update(Users)
        .set({ token: tokens.join(",") })
        .where(eq(Users.id, user?.id || ""))
        .execute()

    deleteCookie(c, "token")
    return c.redirect("/")
})

app.post("/login", async (c) => {
    const body = await c.req.parseBody()
    const username = (body?.username as string) || ""
    const password = (body.password as string) || ""

    const result = await db
        .select()
        .from(Users)
        .where(or(eq(Users.username, username), eq(Users.email, username)))
        .execute()

    if (result.length === 0) {
        return c.redirect("/login")
    }

    const user = result[0]
    const tokens = result[0].token?.split(",")

    if (!bcrypt.compareSync(password, user.password)) {
        return c.redirect("/login")
    }

    const token = await bcrypt.hash(
        user.id + user.username + Date.now() + Math.random() * 1000,
        10
    )
    setCookie(c, "token", token)
    if (tokens) tokens.push(token)
    await db
        .update(Users)
        .set({ token: tokens?.join(",") })
        .where(eq(Users.id, user.id))
        .execute()

    return c.redirect("/")
})

app.get("/actor", async (c) => {
    const accept = c.req.header("Accept")?.match(/[^,; ]+/g) || []

    if (!accept.some((a) => accepts.includes(a))) {
        c.text("Not Acceptable", 406, {
            "Content-Type": "application/activity+json",
        })
    }

    const data = await actor("c30")

    return c.json(data, 200, {
        "Content-Type": "application/activity+json",
    })
})

app.post("/inbox", inboxHandler)

app.get("/authorize-follow", async (c) => {
    const uri = c.req.query("acct")

    if (!uri) {
        return c.text("Bad Request", 400)
    }

    return c.text(`OK ${uri}`)
})

app.get("/manifest.json", async (c) => {
    return c.json(manifest)
})

app.get("/robots.txt", async (c) => {
    return c.text("User-agent: *\nDisallow: /")
})

console.log(`Server is running on port ${PORT}`)

serve({
    fetch: app.fetch,
    port: PORT,
})
