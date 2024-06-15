import { Hono } from "hono"
import fs from "fs"
import path from "path"

const wellKnown = new Hono()

wellKnown.get("/webfinger", (c) => {
    const resource = decodeURIComponent(c.req.query("resource") || "")

    if (resource.match(/acct:@?c30@ap.tty7.uk/)) {
        return c.json({
            subject: resource,
            links: [
                {
                    rel: "self",
                    type: "application/activity+json",
                    href: "https://ap.tty7.uk/actor",
                },
                {
                    rel: "http://webfinger.net/rel/profile-page",
                    type: "text/html",
                    href: "https://ap.tty7.uk/me",
                },
                {
                    rel: "http://ostatus.org/schema/1.0/subscribe",
                    template: "https://ap.tty7.uk/authorize-follow?acct={uri}",
                },
            ],
        })
    }

    return c.text("Not Found", 404)
})

wellKnown.get("/nodeinfo", (c) => {
    return c.json({
        links: [
            {
                rel: "http://nodeinfo.diaspora.software/ns/schema/2.0",
                href: "https://ap.tty7.uk/nodeinfo/2.0",
            },
            {
                rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
                href: "https://ap.tty7.uk/nodeinfo/2.1",
            },
        ],
    })
})

wellKnown.get("/host-meta", (c) => {
    const hostMeta = fs.readFileSync(
        path.join(process.cwd(), "/src/host-meta"),
        "utf-8"
    )
    return c.text(hostMeta, 200, { "Content-Type": "application/xrd+xml" })
})

wellKnown.get("/host-meta.json", (c) => {
    const hostMeta = {
        links: [
            {
                rel: "lrdd",
                type: "application/jrd+xml",
                template: "https://ap.tty7.uk/webfinger?resource={uri}",
            },
        ],
    }

    return c.json(hostMeta)
})

export default wellKnown
