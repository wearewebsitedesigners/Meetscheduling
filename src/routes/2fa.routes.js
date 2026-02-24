const express = require("express");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, signAuthToken } = require("../middleware/auth");
const { requireUser, enableUser2FA, disableUser2FA, getBackupCodes, removeBackupCode } = require("../services/users.service");
const { query } = require("../db/pool");

const router = express.Router();

router.post(
    "/setup",
    requireAuth,
    asyncHandler(async (req, res) => {
        const user = await requireUser(req.auth.userId);

        if (user.two_factor_enabled) {
            return res.status(400).json({ error: "2FA is already enabled." });
        }

        const secret = speakeasy.generateSecret({
            name: `Meetscheduling (${user.email})`,
            length: 20
        });

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            secret: secret.base32,
            qrCode: qrCodeUrl
        });
    })
);

router.post(
    "/verify-setup",
    requireAuth,
    asyncHandler(async (req, res) => {
        const user = await requireUser(req.auth.userId);
        const { token, secret } = req.body;

        if (!token || !secret) {
            return res.status(400).json({ error: "Token and secret are required" });
        }

        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: "base32",
            token: token,
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ error: "Invalid verification code." });
        }

        const { backupCodes } = await enableUser2FA(user.id, secret);

        res.json({ success: true, backupCodes });
    })
);

router.post(
    "/verify-login",
    asyncHandler(async (req, res) => {
        const { tempToken, code } = req.body;

        if (!tempToken || !code) {
            return res.status(400).json({ error: "Token and verification code are required" });
        }

        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET || "default_secret");
        } catch (err) {
            return res.status(401).json({ error: "Invalid or expired temporary token" });
        }

        if (!decoded.temp2FA) {
            return res.status(401).json({ error: "Invalid token type" });
        }

        const user = await requireUser(decoded.userId);

        let isBackupCode = false;
        // Our backup codes are 8 char strings
        if (code.length === 8 && user.two_factor_backup_codes) {
            for (const hash of user.two_factor_backup_codes) {
                if (await bcrypt.compare(code, hash)) {
                    isBackupCode = true;
                    await removeBackupCode(user.id, hash);
                    break;
                }
            }
        }

        if (!isBackupCode) {
            const verified = speakeasy.totp.verify({
                secret: user.two_factor_secret,
                encoding: "base32",
                token: code,
                window: 1
            });

            if (!verified) {
                return res.status(401).json({ error: "Invalid verification code" });
            }
        }

        const authToken = signAuthToken({
            userId: user.id,
            email: user.email,
            username: user.username,
            plan: user.plan,
        });

        res.json({ token: authToken, user: { id: user.id, email: user.email, username: user.username, plan: user.plan, timezone: user.timezone } });
    })
);

router.post(
    "/disable",
    requireAuth,
    asyncHandler(async (req, res) => {
        const { password } = req.body;

        const result = await query(
            `SELECT password_hash FROM users WHERE id = $1`,
            [req.auth.userId]
        );

        const userPass = result.rows[0]?.password_hash;

        if (userPass) {
            if (!password) {
                return res.status(400).json({ error: "Password is required to disable 2FA." });
            }
            const isMatch = await bcrypt.compare(password, userPass);
            if (!isMatch) {
                return res.status(401).json({ error: "Incorrect password." });
            }
        }

        await disableUser2FA(req.auth.userId);

        res.json({ success: true });
    })
);

router.get(
    "/status",
    requireAuth,
    asyncHandler(async (req, res) => {
        const user = await requireUser(req.auth.userId);
        res.json({ enabled: user.two_factor_enabled });
    })
);

module.exports = router;
