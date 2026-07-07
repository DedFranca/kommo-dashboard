import { existsSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const nextDir = join(process.cwd(), ".next");

function removeNextDir(dir) {
  if (!existsSync(dir)) {
    console.log("No .next cache to remove");
    return;
  }

  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    console.log("Removed .next cache");
    return;
  } catch (err) {
    const locked = ["ENOTEMPTY", "EBUSY", "EPERM", "EACCES"].includes(err?.code);
    if (!locked) throw err;

    const backup = `${dir}.bak-${Date.now()}`;
    try {
      renameSync(dir, backup);
      console.log(`Cache .next estava em uso — renomeado para ${backup.split(/[/\\]/).pop()}`);
      return;
    } catch {
      console.error(
        "Não foi possível limpar .next. Pare o servidor dev (Ctrl+C no terminal do npm run dev) e execute novamente:",
      );
      console.error("  npm run dev:clean");
      process.exit(1);
    }
  }
}

removeNextDir(nextDir);
