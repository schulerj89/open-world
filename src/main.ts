import "./styles.css";
import { AeolianWilds } from "./core/AeolianWilds";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root");
}

const app = new AeolianWilds(root);
void app.start();

