import { createHash } from "crypto";

export function someHashFunction(plaintext: string): string {
  // OPCIONAL: Usa una “pepper” secreta desde variables de entorno
  const pepper = process.env.SECRET_PEPPER || "";
  return createHash("sha256")
    .update(plaintext + pepper)
    .digest("hex");
}
