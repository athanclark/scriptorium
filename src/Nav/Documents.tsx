// Copyright (C) 2025  Athan Clark
import { __LOCAL_DB } from "../consts";
import { otherColor, iconBackgroundStyles, swatches } from "../colors";
import { type Syntax } from "../Document/Editor";
import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import { Button, Divider, Title, Accordion, NavLink, Loader, Anchor, TextInput, ColorInput, Typography, Modal, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowLeft, IconPlus, IconTrash, IconRecycle, IconAlertTriangle } from '@tabler/icons-react';
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import "./Documents.css";

export type Document = {
  id: string,
  name: string,
  icon: string | null,
  iconColor: string | null,
  trash: boolean | number,
}

type DocumentsProps = {
  book: string | null;
  onSelectDocument: React.Dispatch<React.SetStateAction<string | null>>;
  goBack: () => void;
  reload: boolean;
  defaultSyntax: Syntax;
  selectedDoc: string | null;
};

function Documents({ book, onSelectDocument, goBack, reload, defaultSyntax, selectedDoc }: DocumentsProps) {
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [bookName, setBookName] = useState<string>("");
  const [bookIcon, setBookIcon] = useState<string | null>(null)
  const [bookIconColor, setBookIconColor] = useState<string | null>("");
  const [bookTrash, setBookTrash] = useState<boolean | null>(null);
  const [openedDeleteBook, { open: openDeleteBook, close: closeDeleteBook }] = useDisclosure();
  const [openedTrashBook, { open: openTrashBook, close: closeTrashBook }] = useDisclosure();
  const [openedEmojiPicker, { open: openEmojiPicker, close: closeEmojiPicker }] = useDisclosure();

  function actuallyReload() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        const bs = await db.select<Document[]>("SELECT id, name, icon, icon_color AS iconColor FROM documents WHERE book = $1", [book]);
        setDocuments(bs);
        const res = await db.select<Document[]>("SELECT name, icon, trash, icon_color AS iconColor FROM books WHERE id = $1", [book]);
        setBookName(res[0].name);
        setBookIcon(res[0].icon);
        setBookIconColor(res[0].iconColor);
        setBookTrash(res[0].trash === 1);
      } catch(e) {
        console.error("Fetching documents Failed", e);
      }
    }
    book && go();
  }

  useEffect(() => {
    actuallyReload();
  }, [book, reload]);

  const renderedDocuments = documents
    ? documents.map(d => {
      const bg = d.iconColor ? `linear-gradient(45deg, ${d.iconColor}, ${otherColor(d.iconColor)})` : "";
      const iconStyles = d.iconColor ? { ...iconBackgroundStyles, background: bg} : {};
      const icon = d.icon ? (<span style={iconStyles}>{d.icon}</span>) : null;
      return (<NavLink
        key={d.id}
        active={(selectedDoc && d.id === selectedDoc) || false}
        label={d.name === "" ? (<em>No Document Name</em>) : d.name}
        leftSection={icon}
        onClick={() => onSelectDocument(d.id)}
      />);
    })
    : (<Loader color="blue" />);

  function changeBookName(newBookName: string) {
    setBookName(newBookName);
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE books SET name = $2 WHERE id = $1", [book, newBookName]);
      } catch(e) {
        console.error("Updating Book Failed", e);
      }
    }
    go();
  }

  function changeBookIcon(newBookIcon: string) {
    setBookIcon(newBookIcon);
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE books SET icon = $2 WHERE id = $1", [book, newBookIcon]);
      } catch(e) {
        console.error("Updating Book Failed", e);
      }
    }
    go();
  }

  function changeBookIconColor(newBookIconColor: string) {
    setBookIconColor(newBookIconColor);
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE books SET icon_color = $2 WHERE id = $1", [book, newBookIconColor]);
      } catch(e) {
        console.error("Updating Book Failed", e);
      }
    }
    go();
  }

  function deleteBook() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("DELETE FROM books WHERE id = $1", [book]);
        closeDeleteBook();
        goBack();
      } catch(e) {
        console.error("Deleting Book Failed", e);
      }
    }
    go();
  }

  function trashBook() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE books SET trash = 1 WHERE id = $1", [book]);
        closeTrashBook();
        goBack();
      } catch(e) {
        console.error("Updating Book Failed", e);
      }
    }
    go();
  }

  function restoreBook() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute("UPDATE books SET trash = 0 WHERE id = $1", [book]);
        goBack();
      } catch(e) {
        console.error("Updating Book Failed", e);
      }
    }
    go();
  }

  function newDocument() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        const res = await db.select<{ id: string }[]>(
          "INSERT INTO documents (name, content, book, syntax) VALUES ('', '', $1, $2) RETURNING id",
          [book, defaultSyntax]
        );
        onSelectDocument(res[0].id);
        actuallyReload();
      } catch(e) {
        console.error("Fetching Documents Failed", e);
      }
    }
    go();
  }

  const bg = bookIconColor ? `linear-gradient(45deg, ${bookIconColor}, ${otherColor(bookIconColor)})` : "";
  const iconStyles = bookIconColor ? { ...iconBackgroundStyles, background: bg} : {};
  const icon = bookIcon ? (<span style={iconStyles}>{bookIcon}</span>) : null;

  return (
    <>
      <Modal opened={openedTrashBook} onClose={closeTrashBook} title="Throw Away This Book?">
        <Typography>Are you sure you want to put {bookName} in the trash? It can be undone later.</Typography>
        <Button color="red" onClick={trashBook}>Trash {bookName}</Button>
      </Modal>
      <Modal opened={openedDeleteBook} onClose={closeDeleteBook} title="Delete Book?">
        <Title order={1}>Are you sure you want to delete {bookName}?</Title>
        <Typography>
          <strong>All documents</strong> that belong to it will also be deleted. Make sure you're sure!
        </Typography>
        <Button color="red" onClick={deleteBook}>Delete {bookName}</Button>
      </Modal>
      <Modal opened={openedEmojiPicker} onClose={closeEmojiPicker} title="Pick Icon">
        <Picker data={data} onEmojiSelect={(emoji: { native: string }) => {
          changeBookIcon(emoji.native);
          closeEmojiPicker();
        }} />
      </Modal>
      <Stack>
        <Anchor onClick={goBack}><IconArrowLeft size={12} /> All Books</Anchor>
        <TextInput
          leftSection={icon}
          placeholder="Click to Edit"
          className={"book-name"}
          variant="unstyled"
          styles={_theme => ({
            input: {
              paddingRight: "1rem",
              font: "inherit",
              fontSize: "1.5rem",
              fontStyle: bookName ? "inherit" : "italic",
              color: bookName ? "inherit" : "var(--mantine-color-dimmed0)",
              marginLeft: "0.5rem",
            }
          })}
          value={bookName}
          onChange={e => changeBookName(e.currentTarget.value)}
        />
        <Divider />
        <Title order={3}>Documents</Title>
        {
          !(book === "trash") && (
            bookTrash
              ? (<Button leftSection={<IconRecycle size={14} />} fullWidth onClick={restoreBook}>Restore Book</Button>)
              : (<Button leftSection={<IconPlus size={14} />} fullWidth onClick={newDocument}>New Document</Button>)
          )
        }
        <div>
          { renderedDocuments }
        </div>
        <div>
          <Divider />
          <Accordion>
            <Accordion.Item value="details">
              <Accordion.Control>Details</Accordion.Control>
              <Accordion.Panel>
                <Stack>
                  <Button fullWidth variant="default" onClick={openEmojiPicker} leftSection={<span>{bookIcon}</span>}>Change Icon</Button>
                  <ColorInput
                    placeholder="Change Icon Background"
                    styles={_theme => ({input: {textAlign: "center"}})}
                    swatches={swatches}
                    value={bookIconColor || ""}
                    onChange={(c) => changeBookIconColor(c)}
                    />
                  {
                    !(book === "trash") && (
                      bookTrash
                        ? (<Button leftSection={<IconAlertTriangle size={14} />} color="red" fullWidth onClick={openDeleteBook}>Delete Book</Button>)
                        : (<Button leftSection={<IconTrash size={14} />} color="red" fullWidth onClick={openTrashBook}>Trash Book</Button>)
                    )
                  }
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      </Stack>
    </>
  );
}

export default Documents;
