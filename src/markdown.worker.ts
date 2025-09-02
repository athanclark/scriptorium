// No React here—just your heavy work.
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

self.onmessage = async (e: MessageEvent<string>) => {
  const md = e.data;
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: false })
      .use(rehypeStringify)
      .process(md)
  );
  // just send HTML back
  (self as unknown as Worker).postMessage(html);
};
