import { useState } from "react";
import reactLogo from "./assets/react.svg";
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
};

type EditorType = "md" | "adoc" | "html";

function Editor({ value, setValue }: EditorProps) {
  const [editorType, setEditorType] = useState("md");

  return (
    <>
      <NativeSelect
        label="Document Syntax"
        value={editorType}
        onChange={(event) => {
          setEditorType(event.currentTarget.selectedOptions[0].value);
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
          <Edit value={value} setValue={setValue} editorType={editorType} />
        </Tabs.Panel>
        <Tabs.Panel value="view">
          <View value={value} editorType={editorType} />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

type EditProps = {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  editorType: EditorType;
};

function Edit({ value, setValue, editorType }: EditProps) {
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
  editorType: EditorType;
};

const asciidoctor = Asciidoctor();

function View({ value, editorType }: ViewProps) {
  console.log("viewing", value, editorType);
  const renderedValue = editorType === "md"
    ? (<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{value}</ReactMarkdown>)
    : editorType === "adoc"
    ? (<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(asciidoctor.convert(value)) }} />)
    : editorType === "html"
    ? (<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />)
    : (<span>Editor Type Not Supported</span>);
  return (
    <Typography>
      {renderedValue}
    </Typography>
  );
}

export default Editor;
