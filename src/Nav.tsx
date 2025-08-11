import Documents from "./Nav/Documents";
import Books from "./Nav/Books";
import { __LOCAL_DB } from "./consts";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import { Button, Title, NavLink, Loader, Anchor, Transition, TextInput, ColorInput, Typography, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowLeft, IconPlus } from '@tabler/icons-react';
import "./Nav.css";

type NavProps = {
  onSelectDocument: React.Dispatch<React.SetStateAction<string>>;
  reload: bool;
};

function Nav({ onSelectDocument, reload }: NavProps) {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [reloadBooks, setReloadBooks] = useState(false);

  return (
    <div className="nav">
      <Transition
        mounted={!selectedBook}
        transition="fade-left"
        duration={400}
        timingFunction="ease">
        {(styles) => <div style={styles}>
          <Books
            onSelectBook={setSelectedBook}
            reload={reloadBooks}
          />
        </div>}
      </Transition>
      <Transition
        mounted={!!selectedBook}
        transition="fade-left"
        duration={400}
        timingFunction="ease">
        {(styles) => <div style={styles}>
          <Documents
            book={selectedBook}
            onSelectDocument={onSelectDocument}
            reload={reload}
            goBack={() => {
              setSelectedBook(null);
              setReloadBooks(!reloadBooks);
            }}
          />
        </div>}
      </Transition>
    </div>
  );
}

export default Nav;
