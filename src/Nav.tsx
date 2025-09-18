// Copyright (C) 2025  Athan Clark
import Documents from "./Nav/Documents";
import Books from "./Nav/Books";
import { type Syntax } from "./Document/Editor";
import { __LOCAL_DB } from "./consts";
import { useState, useEffect } from "react";
import { Transition } from "@mantine/core";
import "./Nav.css";

type NavProps = {
  onSelectDocument: React.Dispatch<React.SetStateAction<string | null>>;
  onChangeBooks: () => void;
  reload: boolean;
  selectedBook: string | null;
  setSelectedBook: React.Dispatch<React.SetStateAction<string | null>>;
  defaultSyntax: Syntax;
  selectedDoc: string | null;
};

function Nav({ onSelectDocument, onChangeBooks, reload, selectedBook, setSelectedBook, defaultSyntax, selectedDoc }: NavProps) {
  // immediate change - used for navigation
  const [bookIsSelected, setBookIsSelected] = useState<boolean>(false);
  const [reloadBooks, setReloadBooks] = useState(false);

  useEffect(() => {
    setReloadBooks(!reloadBooks);
  }, [reload])

  return (
    <div className="nav" style={{overflowY: "auto"}}>
      <Transition
        mounted={!bookIsSelected}
        transition="fade-right"
        duration={400}
        timingFunction="ease">
        {(styles) => <div style={styles}>
          <Books
            onSelectBook={(b) => {
              setSelectedBook(b);
              setBookIsSelected(true);
            }}
            clearSelectedDocument={() => onSelectDocument(null)}
            reload={reloadBooks}
          />
        </div>}
      </Transition>
      <Transition
        mounted={bookIsSelected}
        transition="fade-left"
        duration={400}
        timingFunction="ease">
        {(styles) => <div style={styles}>
          <Documents
            book={selectedBook}
            onSelectDocument={onSelectDocument}
            reload={reload}
            goBack={() => {
              onChangeBooks();
              setBookIsSelected(false);
              setReloadBooks(!reloadBooks);
            }}
            defaultSyntax={defaultSyntax}
            selectedDoc={selectedDoc}
          />
        </div>}
      </Transition>
    </div>
  );
}

export default Nav;
