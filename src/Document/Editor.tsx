import { useState } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
// import { convertFileSrc } from "@tauri-apps/api/tauri"
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
  setValue: React.Dispatch<React.SetStateAction<string>>;
  syntax: Syntax;
  setSyntax: React.Dispatch<React.SetStateAction<Syntax>>;
};

export type Syntax = "md" | "adoc" | "html";

function Editor({ value, setValue, syntax, setSyntax }: EditorProps) {
  const [currentTab, setCurrentTab] = useState<string | null>("edit");

  return (
    <>
      <NativeSelect
        label="Document Syntax"
        value={syntax}
        onChange={(event) => {
          const newSyntax = event.currentTarget.selectedOptions[0].value;
          setSyntax(newSyntax);
        }}
        data={[
          {label: "Markdown", value: "md"},
          {label: "ASCIIdoc", value: "adoc"},
          {label: "HTML", value: "html"}
        ]}
      />
      <Tabs value={currentTab} onChange={setCurrentTab}>
        <Tabs.List>
          <Tabs.Tab value="edit" leftSection={<IconEdit size={12} />}>Edit</Tabs.Tab>
          <Tabs.Tab value="view" leftSection={<IconEye size={12} />}>View</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="edit">
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
  setValue: React.Dispatch<React.SetStateAction<string>>;
  syntax: Syntax;
};

function Edit({ value, setValue, syntax }: EditProps) {
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
