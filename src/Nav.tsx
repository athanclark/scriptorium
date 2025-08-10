import Editor from "./Editor";
import { __LOCAL_DB } from "./consts";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import { Button, Title, NavLink, Loader, Anchor, Transition, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowLeft } from '@tabler/icons-react';
import "./Nav.css";

type NavProps = {
  onSelectDocument: React.Dispatch<React.SetStateAction<string>>;
};

function Nav({ onSelectDocument }: NavProps) {
  const [selectedBook, setSelectedBook] = useState<{id: string, name: string} | null>(null);

  return (
    <div class="nav">
      <Transition
        mounted={!selectedBook}
        transition="fade-left"
        duration={400}
        timingFunction="ease">
        {(styles) => <div style={styles}>
          <Books onSelectBook={setSelectedBook} />
        </div>}
      </Transition>
      <Transition
        mounted={!!selectedBook}
        transition="fade-left"
        duration={400}
        timingFunction="ease">
        {(styles) => <div style={styles}>
          <Documents
            book={selectedBook ? selectedBook.id : null}
            initBookName={selectedBook ? selectedBook.name : null}
            onSelectDocument={onSelectDocument}
            goBack={() => setSelectedBook(null)}
          />
        </div>}
      </Transition>
    </div>
  );
}

type Book = {
  id: string;
  name: string;
  icon: string | null;
  iconColor: string | null;
};

type BooksProps = {
  onSelectBook: React.Dispatch<React.SetStateAction<{id: string, name: string}>>;
};

function Books({ onSelectBook }: BooksProps) {
  const [books, setBooks] = useState<Book[] | null>(null);

  useEffect(() => {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        const bs = await db.select<Book>("SELECT id, name, icon, icon_color AS iconColor FROM books");
        setBooks(bs);
      } catch(e) {
        console.error("Fetching Books Failed", e);
      }
    }
    go();
  }, []);

  const renderedBooks = books
    ? books.map(b => {
      const iconStyles = b.iconColor ? {backgroundColor: b.iconColor} : {};
      const icon = b.icon ? (<span style={iconStyles}>{b.icon}</span>) : null;
      return (<NavLink
        key={b.id}
        href="#"
        label={b.name}
        icon={icon}
        onClick={() => onSelectBook({id: b.id, name: b.name})}
      />);
    })
    : (<Loader color="blue" />);

  return (
    <>
      <Title order={3}>Books</Title>
      { renderedBooks }
    </>
  );
}

type Document = {
  id: string,
  name: string,
  icon: string | null,
  iconColor: string | null,
}

type DocumentsProps = {
  book: string | null;
  initBookName: string | null;
  onSelectDocument: React.Dispatch<React.SetStateAction<string>>;
  goBack: () => void;
};

function Documents({ book, initBookName, onSelectDocument, goBack }: DocumentsProps) {
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [bookName, setBookName] = useState(initBookName || "");

  useEffect(() => {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        const bs = await db.select<Document>("SELECT id, name, icon, icon_color AS iconColor FROM documents WHERE book = $1", [book]);
        setDocuments(bs);
      } catch(e) {
        console.error("Fetching documents Failed", e);
      }
    }
    book && go();
  }, [book]);

  const renderedDocuments = documents
    ? documents.map(d => {
      const iconStyles = d.iconColor ? {backgroundColor: d.iconColor} : {};
      const icon = d.icon ? (<span style={iconStyles}>{d.icon}</span>) : null;
      return (<NavLink
        key={d.id}
        href="#"
        label={d.name}
        icon={icon}
        onClick={() => onSelectDocument(d.id)}
      />);
    })
    : (<Loader color="blue" />);

  function changeBookName(newBookName) {
    setBookName(newBookName);

  }

  return (
    <>
      <Anchor href="#" onClick={goBack}><IconArrowLeft /> All Books</Anchor>
      <TextInput label="Book Name" value={bookName} onChange={(event) => changeBookName(event.currentTarget.value)} />
      <Title order={3}>Documents</Title>
      { renderedDocuments }
    </>
  );
}

export default Nav;
