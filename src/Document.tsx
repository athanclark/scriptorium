import { __LOCAL_DB } from "./consts";
import { swatches } from "./colors";
import { type Book } from "./Nav/Books";
import { type Document } from "./Nav/Documents";
import Editor, { type Syntax } from "./Document/Editor";
import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import { Stack, Button, Divider, Accordion, TextInput, ColorInput, Typography, Modal, Title, NavLink, Grid } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useDebouncedCallback } from "use-debounce";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import "./Document.css";

type DocumentProps = {
  doc: string | null;
  reload: boolean;
  onUpdateDocument: () => void;
  onDeleteDocument: () => void;
  toBook: React.Disptach<React.SetStateAction<string | null>>;
};

function Document({ doc, reload, onUpdateDocument, onDeleteDocument, toBook }: DocumentProps) {
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState<string | null>(null);
  const [syntax, setSyntax] = useState<Syntax>("md");
  const [book, setBook] = useState<string | null>(null);
  const [openedDeleteDocument, { open: openDeleteDocument, close: closeDeleteDocument }] = useDisclosure();
  const [otherBooks, setOtherBooks] = useState<Book[] | null>(null);
  const [openedMoveDocument, { open: openMoveDocument, close: closeMoveDocument }] = useDisclosure();
  const [openedTrashDocument, { open: openTrashDocument, close: closeTrashDocument }] = useDisclosure();
  const [openedEmojiPicker, { open: openEmojiPicker, close: closeEmojiPicker }] = useDisclosure();

  function actuallyReload() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        const res = await db.select<(Document & { book: string, syntax: Syntax, content: string })[]>(
          "SELECT name, syntax, content, book, icon, icon_color AS iconColor FROM documents WHERE id = $1",
          [doc]
        );
        setName(res[0].name);
        setContent(res[0].content);
        setIcon(res[0].icon);
        setIconColor(res[0].iconColor);
        setSyntax(res[0].syntax);
        setBook(res[0].book);
        const bs = await db.select<Book[]>("SELECT id, name, trash, icon, icon_color AS iconColor FROM books WHERE trash = 0 AND id <> $1", [res[0].book]);
        setOtherBooks(bs);
      } catch(e) {
        console.error("Fetching document details Failed", e);
      }
    }
    doc && go();
  }

  useEffect(() => {
    actuallyReload();
  }, [doc, reload]);

  function changeDocumentName(newDocumentName: string) {
    setName(newDocumentName);
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE documents SET name = $2 WHERE id = $1", [doc, newDocumentName]);
        onUpdateDocument();
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

  function changeSyntax(newSyntax: Syntax) {
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
        console.error("Deleting Document Failed", e);
      }
    }
    go();
  }

  function trashDocument() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE documents SET book = 'trash' WHERE id = $1", [doc]);
        closeTrashDocument();
        onDeleteDocument();
      } catch(e) {
        console.error("Updating Document Failed", e);
      }
    }
    go();
  }

  function moveDocument(newBook: string) {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE documents SET book = $2 WHERE id = $1", [doc, newBook]);
        closeMoveDocument();
        toBook(newBook);
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
      <Modal opened={openedTrashDocument} onClose={closeTrashDocument} title="Throw Away This Document?">
        <Typography>Are you sure you want to orphan {name} to the "Trash" book? It can be undone later.</Typography>
        <Button color="red" onClick={trashDocument}>Trash {name}</Button>
      </Modal>
      <Modal opened={openedMoveDocument} onClose={closeMoveDocument} title="Move Document?">
        <Title order={1}>Where do you want to move {name}?</Title>
        {
          otherBooks && otherBooks.map(b => {
            const iconStyles = b.iconColor ? {backgroundColor: b.iconColor} : {};
            const icon = b.icon ? (<span style={iconStyles}>{b.icon}</span>) : null;
            return (
              <NavLink
                key={b.id}
                href="#"
                onClick={() => moveDocument(b.id)}
                label={b.name === "" ? (<em>No Book Name</em>) : b.name}
                leftSection={icon}
              />
            );
          })
        }
      </Modal>
      <Modal opened={openedEmojiPicker} onClose={closeEmojiPicker} title="Pick Icon">
        <Picker
          data={data}
          onEmojiSelect={(emoji: { native: string }) => {
            changeDocumentIcon(emoji.native);
            closeEmojiPicker();
          }} />
      </Modal>
      <Stack>
        <TextInput
          value={name}
          onChange={(event) => changeDocumentName(event.currentTarget.value)}
          variant="unstyled"
          placeholder="Click to Edit"
          className={"document-name"}
          styles={theme => ({
            input: {
              font: "inherit",
              fontSize: "2rem",
              fontStyle: name ? "inherit" : "italic",
              color: name ? "inherit" : "var(--mantine-color-dimmed0)",
            }
          })}
        />
        <Editor
          value={content}
          setValue={changeDocumentContent}
          syntax={syntax}
          setSyntax={changeSyntax}
        />
        <div>
          <Divider />
          <Accordion style={{}}>
            <Accordion.Item value="details">
              <Accordion.Control>Details</Accordion.Control>
              <Accordion.Panel>
                <Grid>
                  <Grid.Col span={{base: 12, md: 6, lg: 3}}>
                    <Button fullWidth variant="default" onClick={openEmojiPicker} leftSection={<span>{icon}</span>}>Change Icon</Button>
                  </Grid.Col>
                  <Grid.Col span={{base: 12, md: 6, lg: 3}}>
                    <ColorInput styles={theme => ({input: {textAlign: "center"}})} swatches={swatches} value={iconColor || ""} onChangeEnd={(c) => changeDocumentIconColor(c)} />
                  </Grid.Col>
                  <Grid.Col span={{base: 12, md: 6, lg: 3}}>
                    <Button fullWidth variant="default" onClick={openMoveDocument}>Move Document</Button>
                  </Grid.Col>
                  <Grid.Col span={{base: 12, md: 6, lg: 3}}>
                    {
                      book === "trash"
                        ? (<Button fullWidth color="red" onClick={openDeleteDocument}>Delete Document</Button>)
                        : (<Button fullWidth color="red" onClick={openTrashDocument}>Trash Document</Button>)
                    }
                  </Grid.Col>
                </Grid>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      </Stack>
    </>
  );
}

export default Document;
