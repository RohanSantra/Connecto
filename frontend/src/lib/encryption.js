// src/lib/encryption.js
import nacl from "tweetnacl";

/* base64 helpers that normalize URL-safe + padding */
function toBase64(u8) {
  return btoa(String.fromCharCode(...u8));
}
function normalizeBase64(s) {
  if (!s) return "";
  const noSpaces = s.replace(/\s+/g, "");
  const norm = noSpaces.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 ? 4 - (norm.length % 4) : 0;
  return norm + "=".repeat(pad);
}
function fromBase64(s) {
  try {
    const n = normalizeBase64(s);
    const bin = atob(n);
    return Uint8Array.from(Array.from(bin).map(c => c.charCodeAt(0)));
  } catch (e) {
    return null;
  }
}

function generateSymmetricKey() {
  return nacl.randomBytes(32);
}

function encryptMessageWithKey(plaintext, key) {
  const nonce = nacl.randomBytes(24);
  const msg = new TextEncoder().encode(plaintext);
  const box = nacl.secretbox(msg, nonce, key);
  return {
    ciphertext: toBase64(box),
    nonce: toBase64(nonce)
  };
}

function encryptKeyForDevice(symmetricKey, recipientPublicKeyBase64) {
  // ephemeral keypair (per message)
  const ephemeral = nacl.box.keyPair();

  const recipientPub = fromBase64(recipientPublicKeyBase64);
  if (!recipientPub) throw new Error("Invalid recipient public key");

  const nonce = nacl.randomBytes(24);
  // encrypt symmetricKey with ephemeral secret + recipient public
  const encrypted = nacl.box(symmetricKey, nonce, recipientPub, ephemeral.secretKey);

  return {
    encryptedKey: toBase64(encrypted),
    nonce: toBase64(nonce),
    senderEphemeralPublicKey: toBase64(ephemeral.publicKey)
  };
}

/**
 * devices: [{ userId, deviceId, publicKey }]
 * returns { ciphertext, ciphertextNonce, encryptedKeys: [ {recipientUserId, encryptedKey, senderEphemeralPublicKey, nonce} ] }
 */
export function encryptOutgoingMessage(plaintext, devices = []) {
  if (!Array.isArray(devices)) devices = [];

  // generate symmetric key and encrypt message
  const symmetricKey = generateSymmetricKey();
  const msgBox = encryptMessageWithKey(plaintext, symmetricKey);

  const encryptedKeys = devices.map((dev) => {
    if (!dev.publicKey) throw new Error("Missing device publicKey");
    const ek = encryptKeyForDevice(symmetricKey, dev.publicKey);
    return {
      recipientUserId: dev.userId,
      encryptedKey: ek.encryptedKey,
      senderEphemeralPublicKey: ek.senderEphemeralPublicKey,
      nonce: ek.nonce
    };
  });

  return {
    ciphertext: msgBox.ciphertext,
    ciphertextNonce: msgBox.nonce,
    encryptedKeys
  };
}
