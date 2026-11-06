import { SignJWT, jwtVerify } from "jose";

export type LightToken = {
  phone: string;
  programId: string;
  role: string;
  post: string;
  name: string;
};

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "venturex-light-dev");
}

export async function signLightToken(input: LightToken, expiresAt: Date) {
  return new SignJWT({ typ: "light", ...input })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret());
}

export async function readLightToken(token: string): Promise<LightToken | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== "light" || !payload.programId || !payload.phone) return null;
    return {
      phone: String(payload.phone),
      programId: String(payload.programId),
      role: String(payload.role ?? ""),
      post: String(payload.post ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}
