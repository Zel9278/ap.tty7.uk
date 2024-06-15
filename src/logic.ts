/**
 * Based on Matchbox
 * Matchbox https://gitlab.com/acefed/matchbox Copyright (c) 2022 Acefed MIT License
 *
 * this source code using https://github.com/yusukebe/minidon/blob/main/src/logic.ts
 */

import { btos, stob } from "./utils"

export const getInbox = async (req: string) => {
    const res = await fetch(req, {
        method: "GET",
        headers: { Accept: "application/activity+json" },
    })
    return res.json()
}

export const postInbox = async (
    req: string,
    data: any,
    headers: { [key: string]: string }
) => {
    const res = await fetch(req, {
        method: "POST",
        body: JSON.stringify(data),
        headers,
    })
    return res
}

export const signHeaders = async (
    res: any,
    strName: string,
    strHost: string,
    strInbox: string,
    privateKey: CryptoKey
) => {
    const strTime = new Date().toUTCString()
    const s = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(res))
    )
    const s256 = btoa(btos(s))
    const sig = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        stob(
            `(request-target): post ${new URL(strInbox).pathname}\n` +
                `host: ${new URL(strInbox).hostname}\n` +
                `date: ${strTime}\n` +
                `digest: SHA-256=${s256}`
        )
    )
    const b64 = btoa(btos(sig))
    const headers = {
        Host: new URL(strInbox).hostname,
        Date: strTime,
        Digest: `SHA-256=${s256}`,
        Signature:
            `keyId="https://${strHost}/u/${strName}",` +
            `algorithm="rsa-sha256",` +
            `headers="(request-target) host date digest",` +
            `signature="${b64}"`,
        Accept: "application/activity+json",
        "Content-Type": "application/activity+json",
        "Accept-Encoding": "gzip",
        "User-Agent": `Minidon/0.0.0 (+https://${strHost}/)`,
    }
    return headers
}

export const acceptFollow = async (
    id: string,
    actor: string,
    inbox: any,
    object: any,
    privateKey: CryptoKey
) => {
    const strId = crypto.randomUUID()
    const strInbox = inbox
    const res = {
        "@context": "https://www.w3.org/ns/activitystreams",
        id,
        type: "Accept",
        actor,
        object,
    }
    const headers = await signHeaders(
        res,
        strName,
        strHost,
        strInbox,
        privateKey
    )
    await postInbox(strInbox, res, headers)
}

export const createNote = async (
    strId: string,
    strName: string,
    strHost: string,
    x: any,
    y: string,
    privateKey: CryptoKey
) => {
    const strTime = new Date().toISOString().substring(0, 19) + "Z"
    const strInbox = x.inbox
    const res = {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `https://${strHost}/u/${strName}/s/${strId}/activity`,
        type: "Create",
        actor: `https://${strHost}/u/${strName}`,
        published: strTime,
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        cc: [`https://${strHost}/u/${strName}/followers`],
        object: {
            id: `https://${strHost}/u/${strName}/s/${strId}`,
            type: "Note",
            attributedTo: `https://${strHost}/u/${strName}`,
            content: y,
            url: `https://${strHost}/u/${strName}/s/${strId}`,
            published: strTime,
            to: ["https://www.w3.org/ns/activitystreams#Public"],
            cc: [`https://${strHost}/u/${strName}/followers`],
        },
    }
    const headers = await signHeaders(
        res,
        strName,
        strHost,
        strInbox,
        privateKey
    )
    await postInbox(strInbox, res, headers)
}

export const deleteNote = async (
    strName: string,
    strHost: string,
    x: any,
    y: string,
    privateKey: CryptoKey
) => {
    const strId = crypto.randomUUID()
    const strInbox = x.inbox
    const res = {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `https://${strHost}/u/${strName}/s/${strId}/activity`,
        type: "Delete",
        actor: `https://${strHost}/u/${strName}`,
        object: {
            id: y,
            type: "Note",
        },
    }
    const headers = await signHeaders(
        res,
        strName,
        strHost,
        strInbox,
        privateKey
    )
    await postInbox(strInbox, res, headers)
}
