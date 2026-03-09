import { randomBytes, randomInt } from "node:crypto";

export interface PairingState {
  pairingCode: string;
  tokens: Set<string>;
}

export function createPairingState(): PairingState {
  const code = String(randomInt(100000, 999999));
  return { pairingCode: code, tokens: new Set() };
}

export function generateToken(): string {
  return "ahud_" + randomBytes(16).toString("base64url");
}

export function attemptPair(state: PairingState, code: string): string | null {
  if (code !== state.pairingCode) return null;
  const token = generateToken();
  state.tokens.add(token);
  return token;
}

export function validateToken(state: PairingState, authHeader: string | undefined): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  return state.tokens.has(token);
}
