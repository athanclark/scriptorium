import { __LOCAL_DB } from "./consts";
import Editor, { type Syntax } from "./Document/Editor";
import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import { AppShell, Burger, Button, TextInput, ColorInput, Typography, Modal, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useDebouncedCallback } from "use-debounce";

type DocumentProps = {
  doc: string | null;
  onUpdateDocument: () => void;
  onDeleteDocument: () => void;
};

function Document({ doc, onUpdateDocument, onDeleteDocument }: DocumentProps) {
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState<string | null>(null);
  const [syntax, setSyntax] = useState<Syntax>("md");
  const [openedDeleteDocument, { open: openDeleteDocument, close: closeDeleteDocument }] = useDisclosure();

  function reload() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        const res = await db.select<Document>("SELECT name, syntax, content, icon, icon_color AS iconColor FROM documents WHERE id = $1", [doc]);
        setName(res[0].name);
        setContent(res[0].content);
        setIcon(res[0].icon);
        setIconColor(res[0].iconColor);
        setSyntax(res[0].syntax);
      } catch(e) {
        console.error("Fetching document details Failed", e);
      }
    }
    doc && go();
  }

  useEffect(() => {
    reload();
  }, [doc]);

  function changeDocumentName(newDocumentName: string) {
    setName(newDocumentName);
    onUpdateDocument();
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE documents SET name = $2 WHERE id = $1", [doc, newDocumentName]);
      } catch(e) {
        console.error("Updating Document Failed", e);
      }
    }
    go();
  }

  const saveDocumentContent = useDebouncedCallback((newDocumentContent: string) => {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE documents SET content = $2 WHERE id = $1", [doc, newDocumentContent]);
      } catch(e) {
        console.error("Updating Document Failed", e);
      }
    }
    go();
  }, 500);

  function changeDocumentContent(newDocumentContent: string) {
    setContent(newDocumentContent);
    saveDocumentContent(newDocumentContent);
  }

  function changeDocumentIcon(newDocumentIcon: string) {
    setIcon(newDocumentIcon);
    onUpdateDocument();
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE documents SET icon = $2 WHERE id = $1", [doc, newDocumentIcon]);
      } catch(e) {
        console.error("Updating Document Failed", e);
      }
    }
    go();
  }

  function changeDocumentIconColor(newDocumentIconColor: string) {
    setIconColor(newDocumentIconColor);
    onUpdateDocument();
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE documents SET icon_color = $2 WHERE id = $1", [doc, newDocumentIconColor]);
      } catch(e) {
        console.error("Updating Document Failed", e);
      }
    }
    go();
  }

  function changeSyntax(newSyntax: string) {
    setSyntax(newSyntax);
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE documents SET syntax = $2 WHERE id = $1", [doc, newSyntax]);
      } catch(e) {
        console.error("Updating Document Failed", e);
      }
    }
    go();
  }

  function deleteDocument() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("DELETE FROM documents WHERE id = $1", [doc]);
        closeDeleteDocument();
        onDeleteDocument();
      } catch(e) {
        console.error("Updating Document Failed", e);
      }
    }
    go();
  }

  return (
    <>
      <Modal opened={openedDeleteDocument} onClose={closeDeleteDocument} title="Delete Document?">
        <Title order={1}>Are you sure you want to delete {name}?</Title>
        <Typography>
          <strong>All content</strong> that belongs to it will also be deleted. Make sure you're sure!
        </Typography>
        <Button color="red" onClick={deleteDocument}>Delete {name}</Button>
      </Modal>
      <TextInput
        value={name}
        onChange={(event) => changeDocumentName(event.currentTarget.value)}
        label="Document Name"
      />
      <TextInput label="Document Icon" value={icon || ""} onChange={(event) => changeDocumentIcon(event.currentTarget.value)} />
      <ColorInput label="Document Icon Color" value={iconColor || ""} onChangeEnd={(c) => changeDocumentIconColor(c)} />
      <Editor
        value={content}
        setValue={changeDocumentContent}
        syntax={syntax}
        setSyntax={changeSyntax}
      />
      <Button color="red" onClick={openDeleteDocument}>Delete Document</Button>
    </>
  );
}

export default Document;
