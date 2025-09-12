import { useState, useMemo, useRef, useEffect, useDeferredValue, startTransition } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { NativeSelect, Typography, Tabs, Grid } from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { IconEdit, IconEye } from "@tabler/icons-react";
import DOMPurify from "dompurify";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { StreamLanguage } from '@codemirror/language';
import { asciidoc as asciidocMode } from 'codemirror-asciidoc';
import { html } from "@codemirror/lang-html";
import { basicSetup } from "codemirror"
import "./Editor.css";

type EditorProps = {
  value: string;
  setValue: (newValue: string) => void;
  syntax: Syntax;
  setSyntax: (newSyntax: Syntax) => void;
  editAndView: boolean;
};

export type Syntax = "md" | "adoc" | "html";

function Editor({ value, setValue, syntax, setSyntax, editAndView }: EditorProps) {
  const [currentTab, setCurrentTab] = useState<string | null>("view");
  const deferredValue = useDeferredValue(value);

  const tabbed = (
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
          <Edit
            value={value}
            setValue={(v) => {
              setValue(v);
              startTransition(() => {});
            }}
            syntax={syntax}
          />
        </Tabs.Panel>
        <Tabs.Panel value="view">
          { currentTab === "view" && (<View value={deferredValue} syntax={syntax} />) }
        </Tabs.Panel>
      </Tabs>
    </>
  );

  const sideBySide = (
    <Grid>
      <Grid.Col span={{base: 12, lg: 6}}>
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
        <Edit
          value={value}
          setValue={(v) => {
            setValue(v);
            startTransition(() => {});
          }}
          syntax={syntax}
        />
      </Grid.Col>
      <Grid.Col span={{base: 12, lg: 6}}>
        <View value={deferredValue} syntax={syntax} />
      </Grid.Col>
    </Grid>
  );

  return editAndView ? sideBySide : tabbed;
}

// function EditorTabs({ view, edit }:)

type EditProps = {
  value: string;
  setValue: (newValue: string) => void;
  syntax: Syntax;
};

function Edit({ value, setValue, syntax }: EditProps) {
  const colorScheme = useColorScheme();
  const extensions = useMemo(() => [basicSetup], []);
  const completeExtensions = useMemo(() => {
    if (syntax === "md") {
      return [
        ...extensions,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
      ];
    } else if (syntax === "adoc") {
      return [
        ...extensions,
        StreamLanguage.define(asciidocMode),
      ];
    } else {
      return [
        ...extensions,
        html({ autoCloseTags: true }),
      ];
    }
  }, [syntax]);

  return (
    <CodeMirror
      theme={colorScheme}
      value={value}
      onChange={setValue}
      extensions={completeExtensions}
    />
  );
      // style={{
      //   backgroundColor: "rgba(0,0,0,0)",
      //   color: "var(--mantine-color-text)",
      //   borderRadius: "var(--mantine-radius-default)",
      // }}
}

type ViewProps = {
  value: string;
  syntax: Syntax;
};

function View({ value, syntax }: ViewProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    async function go() {
      try {
        if (syntax !== "html") {
          console.log("sending raw", value, syntax);

          const newHtml: string = await invoke(`render_${syntax}`, { value: value });
          console.log("received html", newHtml);
          setHtml(newHtml);
        }
      } catch(e) {
        console.warn("failed to render", e);
      }
    }
    go();
  }, [value]);

  const renderedValue = (syntax === "md" || syntax === "adoc")
    ? (<div dangerouslySetInnerHTML={{ __html: html }} />)
    : syntax === "html"
    ? (<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />)
    : (<span>Editor Type Not Supported</span>);
  return (
    <Typography>
      <MathJaxBlock>
        {renderedValue}
      </MathJaxBlock>
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

// FIXME: I should scan the resulting HTML code and apply `toTauriImgSrc` to each `src` field
// @ts-ignore
const Img: React.FC<JSX.IntrinsicElements['img']> = (props) => {
  const { src, ...rest } = props;
  return <img src={toTauriImgSrc(src)} {...rest} />;
};

function MathJaxBlock({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // @ts-ignore
    window.MathJax?.typesetPromise([ref.current]).catch(console.error);
  }, [children]);

  return <div ref={ref}>{children}</div>;
}

export default Editor;
