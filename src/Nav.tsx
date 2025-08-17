import Documents from "./Nav/Documents";
import Books from "./Nav/Books";
import { __LOCAL_DB } from "./consts";
import { useState } from "react";
import { Transition } from "@mantine/core";
import "./Nav.css";

type NavProps = {
  onSelectDocument: React.Dispatch<React.SetStateAction<string | null>>;
  onChangeBooks: () => void;
  reload: boolean;
};

function Nav({ onSelectDocument, onChangeBooks, reload }: NavProps) {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [bookIsSelected, setBookIsSelected] = useState<boolean>(false);
  const [reloadBooks, setReloadBooks] = useState(false);

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
