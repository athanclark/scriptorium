import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MantineProvider } from "@mantine/core";
import {refractor} from "refractor/core";
import markdown from "refractor/markdown";
import asciidoc from "refractor/asciidoc";

refractor.register(markdown);
refractor.register(asciidoc);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
