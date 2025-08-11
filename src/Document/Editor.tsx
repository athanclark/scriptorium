import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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
      <Tabs defaultValue="edit">
        <Tabs.List>
          <Tabs.Tab value="edit" leftSection={<IconEdit size={12} />}>Edit</Tabs.Tab>
          <Tabs.Tab value="view" leftSection={<IconEye size={12} />}>View</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="edit">
          <Edit value={value} setValue={setValue} syntax={syntax} />
        </Tabs.Panel>
        <Tabs.Panel value="view">
          <View value={value} syntax={syntax} />
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
    ? (<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{value}</ReactMarkdown>)
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

export default Editor;
