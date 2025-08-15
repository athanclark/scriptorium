import Documents from "./Nav/Documents";
import Books from "./Nav/Books";
import { __LOCAL_DB } from "./consts";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import { Button, Title, NavLink, Loader, Anchor, Transition, TextInput, ColorInput, Typography, Modal, MantineProvider, useComputedColorScheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowLeft, IconPlus } from '@tabler/icons-react';
import "./Nav.css";

type NavProps = {
  onSelectDocument: React.Dispatch<React.SetStateAction<string>>;
  onChangeBooks: () => void;
  reload: bool;
};

function Nav({ onSelectDocument, onChangeBooks, reload }: NavProps) {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [bookIsSelected, setBookIsSelected] = useState<boolean>(false);
  const [reloadBooks, setReloadBooks] = useState(false);
  const colorScheme = useComputedColorScheme("auto");

  console.log("color scheme", colorScheme);

  return (
    <div className="nav">
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
              setTimeout(() => {
                setSelectedBook(null);
              }, 500);
              setReloadBooks(!reloadBooks);
            }}
          />
        </div>}
      </Transition>
    </div>
  );
}

export default Nav;
