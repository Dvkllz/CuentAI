import { promisify } from "node:util";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const scrypt = promisify(scryptCallback);
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

export const registerInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export const loginInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

const normalizeEmail = (email) => email.trim().toLocaleLowerCase("en-US");
const tokenHash = (token) =>
  createHash("sha256").update(token).digest("base64url");
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

async function passwordHash(password, salt) {
  return Buffer.from(await scrypt(password, salt, 64)).toString("base64");
}

export function createAuthStore(
  filePath = path.resolve(process.env.AUTH_DATA_FILE || ".data/auth.json"),
) {
  let statePromise;
  let mutation = Promise.resolve();

  async function load() {
    if (!statePromise) {
      statePromise = (async () => {
        try {
          const parsed = JSON.parse(await readFile(filePath, "utf8"));
          return {
            users: Array.isArray(parsed.users) ? parsed.users : [],
            sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
          };
        } catch (error) {
          if (error?.code !== "ENOENT") throw error;
          return { users: [], sessions: [] };
        }
      })();
    }
    return statePromise;
  }

  async function persist(state) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(state), {
      encoding: "utf8",
      mode: 0o600,
    });
  }

  function mutate(action) {
    const result = mutation.then(async () => {
      const state = await load();
      const value = await action(state);
      await persist(state);
      return value;
    });
    mutation = result.catch(() => {});
    return result;
  }

  function createSession(state, userId) {
    const token = randomBytes(32).toString("base64url");
    const now = Date.now();
    state.sessions = state.sessions.filter(
      (session) => session.expiresAt > now,
    );
    state.sessions.push({
      tokenHash: tokenHash(token),
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: now + SESSION_DURATION,
    });
    return token;
  }

  return {
    async register(input) {
      const data = registerInput.parse(input);
      return mutate(async (state) => {
        const email = normalizeEmail(data.email);
        if (state.users.some((user) => user.email === email))
          throw Object.assign(
            new Error("Ya existe una cuenta con este correo."),
            { status: 409 },
          );
        const salt = randomBytes(16).toString("base64");
        const user = {
          id: randomBytes(16).toString("hex"),
          name: data.name,
          email,
          salt,
          passwordHash: await passwordHash(data.password, salt),
          createdAt: new Date().toISOString(),
        };
        state.users.push(user);
        return { user: publicUser(user), token: createSession(state, user.id) };
      });
    },

    async login(input) {
      const data = loginInput.parse(input);
      return mutate(async (state) => {
        const user = state.users.find(
          (candidate) => candidate.email === normalizeEmail(data.email),
        );
        if (!user)
          throw Object.assign(new Error("Correo o contraseña incorrectos."), {
            status: 401,
          });
        const actual = Buffer.from(
          await passwordHash(data.password, user.salt),
          "base64",
        );
        const expected = Buffer.from(user.passwordHash, "base64");
        if (
          actual.length !== expected.length ||
          !timingSafeEqual(actual, expected)
        )
          throw Object.assign(new Error("Correo o contraseña incorrectos."), {
            status: 401,
          });
        return { user: publicUser(user), token: createSession(state, user.id) };
      });
    },

    async authenticate(token) {
      if (!token) return null;
      const state = await load();
      const session = state.sessions.find(
        (candidate) =>
          candidate.tokenHash === tokenHash(token) &&
          candidate.expiresAt > Date.now(),
      );
      if (!session) return null;
      const user = state.users.find(
        (candidate) => candidate.id === session.userId,
      );
      return user ? publicUser(user) : null;
    },

    async logout(token) {
      if (!token) return;
      await mutate((state) => {
        const hash = tokenHash(token);
        state.sessions = state.sessions.filter(
          (session) => session.tokenHash !== hash,
        );
      });
    },
  };
}

export function bearerToken(request) {
  const authorization = request.get("authorization") || "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match?.[1] || "";
}
