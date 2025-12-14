// src/lib/deviceKeys.js
import nacl from "tweetnacl";
import api from "@/api/axios";

/* ---------------------------------------------------------
   BASE64 HELPERS (FULLY SAFE)
--------------------------------------------------------- */
export function toBase64(u8) {
    return btoa(String.fromCharCode(...u8))
        .replace(/\s+/g, ""); // no accidental whitespace
}

export function fromBase64(str) {
    if (!str || typeof str !== "string") return null;

    // Normalize URL-safe -> standard
    let s = str.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");

    // Fix padding
    const pad = s.length % 4;
    if (pad === 2) s += "==";
    else if (pad === 3) s += "=";
    else if (pad === 1) return null; // invalid length

    try {
        const bin = atob(s);
        return Uint8Array.from(bin, (c) => c.charCodeAt(0));
    } catch (err) {
        return null;
    }
}

/* ---------------------------------------------------------
   STORAGE KEYS
--------------------------------------------------------- */
const STORAGE_KEY = "connecto_device_keypair_v1";
const DEVICE_ID_KEY = "connecto_device_id";

/* ---------------------------------------------------------
   ENSURE DEVICE ID EXISTS
--------------------------------------------------------- */
export function getOrCreateDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

export function getLocalDeviceId() {
    return localStorage.getItem(DEVICE_ID_KEY) || getOrCreateDeviceId();
}

/* ---------------------------------------------------------
   GET OR CREATE DEVICE KEYS (per-browser, persistent)
--------------------------------------------------------- */
export function getOrCreateDeviceKeypair() {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
        try {
            const parsed = JSON.parse(stored);

            const pub = fromBase64(parsed.publicKey);
            const priv = fromBase64(parsed.privateKey);

            if (pub && priv) {
                return {
                    publicKey: pub,
                    privateKey: priv,
                    publicKeyBase64: parsed.publicKey,
                    privateKeyBase64: parsed.privateKey
                };
            }
        } catch (e) {
            // fall through -> regenerate
        }
    }

    // Generate brand-new NaCl keypair
    const kp = nacl.box.keyPair();

    const newPair = {
        publicKey: toBase64(kp.publicKey),
        privateKey: toBase64(kp.secretKey),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPair));

    // Make sure deviceId exists
    getOrCreateDeviceId();

    return {
        publicKey: kp.publicKey,
        privateKey: kp.secretKey,
        publicKeyBase64: newPair.publicKey,
        privateKeyBase64: newPair.privateKey
    };
}

/* ---------------------------------------------------------
   REGISTER DEVICE WITH SERVER
   Called in:
   - verifyOtp
   - checkAuth
--------------------------------------------------------- */
export async function registerDeviceWithServer({
    deviceName = "web",
} = {}) {
    const { publicKeyBase64 } = getOrCreateDeviceKeypair();
    const deviceId = getOrCreateDeviceId();

    const payload = {
        deviceId,
        deviceName,
        publicKey: publicKeyBase64,
    };

    // Must use "/device/register" (singular)
    await api.post("/devices/register", payload, { withCredentials: true });

    return { deviceId, publicKey: publicKeyBase64 };
}
