import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { NativeSelect, Typography, Tabs, Textarea } from "@mantine/core";
import { IconEdit, IconEye } from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import DOMPurify from "dompurify";
import Asciidoctor from "asciidoctor";
import "highlight.js/styles/github.css";

type EditorProps = {
  value: string;
  setValue: (newValue: string) => void;
  syntax: Syntax;
  setSyntax: (newSyntax: Syntax) => void;
};

export type Syntax = "md" | "adoc" | "html";

function Editor({ value, setValue, syntax, setSyntax }: EditorProps) {
  const [currentTab, setCurrentTab] = useState<string | null>("view");

  return (
    <>
      <Tabs value={currentTab} onChange={setCurrentTab}>
        <Tabs.List style={{marginBottom: "2rem"}}>
          <Tabs.Tab value="view" leftSection={<IconEye size={12} />}>View</Tabs.Tab>
          <Tabs.Tab value="edit" leftSection={<IconEdit size={12} />}>Edit</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="edit">
          <NativeSelect
            label="Document Syntax"
            value={syntax}
            onChange={(event) => {
              const v = event.currentTarget.selectedOptions[0].value;
              const newSyntax: Syntax = v === "md" ? "md" : v === "adoc" ? "adoc" : v === "html" ? "html" : "md";
              setSyntax(newSyntax);
            }}
            style={{marginBottom: "1rem"}}
            data={[
              {label: "Markdown", value: "md"},
              {label: "ASCIIdoc", value: "adoc"},
              {label: "HTML", value: "html"}
            ]}
          />
          <Edit value={value} setValue={setValue} syntax={syntax} />
        </Tabs.Panel>
        <Tabs.Panel value="view">
          { currentTab === "view" && (<View value={value} syntax={syntax} />) }
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

type EditProps = {
  value: string;
  setValue: (newValue: string) => void;
  syntax: Syntax;
};

function Edit({ value, setValue }: EditProps) {
  return (
    <Textarea
      autosize
      minRows={2}
      label="Document Code"
      value={value}
      onChange={(event) => setValue(event.currentTarget.value)}
    />
  );
}

type ViewProps = {
  value: string;
  syntax: Syntax;
};

const asciidoctor = Asciidoctor();

function View({ value, syntax }: ViewProps) {
  const renderedValue = syntax === "md"
    ? (
      <ReactMarkdown
        components={{ img: Img }}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {value}
      </ReactMarkdown>
    )
    : syntax === "adoc"
    // @ts-ignore
    ? (<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(asciidoctor.convert(value)) }} />)
    : syntax === "html"
    ? (<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />)
    : (<span>Editor Type Not Supported</span>);
  return (
    <Typography>
      {renderedValue}
    </Typography>
  );
}

function toTauriImgSrc(src?: string) {
  if (!src) return src;

  // Handle Unix absolute paths, Windows absolute paths, and file:// URLs
  const isUnixAbs = src.startsWith('/');
  const isWinAbs = /^[a-zA-Z]:[\\/]/.test(src);
  const isFileUrl = src.startsWith('file://');

  if (isUnixAbs || isWinAbs || isFileUrl) {
    // strip file:// for convertFileSrc
    const path = isFileUrl ? src.replace(/^file:\/\//, '') : src;
    try {
      return convertFileSrc(path);
    } catch {
      // In non‑Tauri environments, fall back to original
      return src;
    }
  }

  // Leave http(s), data:, blob:, and relative app assets alone
  return src;
}

const Img: React.FC<JSX.IntrinsicElements['img']> = (props) => {
  const { src, ...rest } = props;
  return <img src={toTauriImgSrc(src)} {...rest} />;
};

export default Editor;
