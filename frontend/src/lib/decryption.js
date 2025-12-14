// src/lib/decryption.js
import nacl from "tweetnacl";
import { getOrCreateDeviceKeypair, getLocalDeviceId } from "./deviceKeys";

function fromBase64(s) {
    if (!s) return null;
    const norm = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    const pad = norm.length % 4 ? 4 - (norm.length % 4) : 0;
    const padded = norm + "=".repeat(pad);
    try {
        const bin = atob(padded);
        return Uint8Array.from(Array.from(bin).map(c => c.charCodeAt(0)));
    } catch (e) {
        return null;
    }
}

export function decryptIncomingMessage(msg) {
    try {
        const { ciphertext, ciphertextNonce, encryptedKeys } = msg;
        if (!encryptedKeys || !Array.isArray(encryptedKeys) || encryptedKeys.length === 0) {
            // nothing to decrypt
            return msg;
        }

        const myDeviceId = getLocalDeviceId();
        const { privateKey } = getOrCreateDeviceKeypair();

        // find the target key for this device
        const myKeyObj = encryptedKeys.find(k => k.recipientDeviceId === myDeviceId);
        if (!myKeyObj) {
            msg.plaintext = null;
            msg.error = "Unable to decrypt — sender key unavailable";
            return msg;
        }

        const senderEphemeral = fromBase64(myKeyObj.senderEphemeralPublicKey);
        const nonceKey = fromBase64(myKeyObj.nonce);
        const encKey = fromBase64(myKeyObj.encryptedKey);

        if (!senderEphemeral || !nonceKey || !encKey) {
            msg.error = "Invalid key encoding";
            return msg;
        }

        // decrypt symmetric key
        const symmetricKey = nacl.box.open(encKey, nonceKey, senderEphemeral, privateKey);
        if (!symmetricKey) {
            msg.error = "Unable to decrypt symmetric key";
            return msg;
        }

        // decrypt message payload
        const cipher = fromBase64(ciphertext);
        const msgNonce = fromBase64(ciphertextNonce);
        if (!cipher || !msgNonce) {
            msg.error = "Invalid message encoding";
            return msg;
        }

        const plainBytes = nacl.secretbox.open(cipher, msgNonce, symmetricKey);
        if (!plainBytes) {
            msg.error = "Unable to decrypt message";
            return msg;
        }

        msg.plaintext = new TextDecoder().decode(plainBytes);
        return msg;
    } catch (e) {
        console.error("decryptIncomingMessage error", e);
        msg.error = "Decrypt error";
        return msg;
    }
}


export function decryptIncomingMessageWithReply(msg) {
    if (!msg) return msg;

    // Step 1 — decrypt main message
    let decrypted = msg;
    try {
        decrypted = decryptIncomingMessage(msg);
    } catch (e) {
        console.warn("Failed to decrypt main message", e);
    }

    // Step 2 — decrypt nested reply message if present
    if (decrypted?.replyMessage) {
        try {
            decrypted.replyMessage = decryptIncomingMessage({
                ...decrypted.replyMessage,
                // ensure nested plaintext does not overwrite outer
                plaintext: decrypted.replyMessage.plaintext || null,
            });
        } catch (e) {
            console.warn("Failed to decrypt reply message", e);
        }
    }

    return decrypted;
}
