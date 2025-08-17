import { __LOCAL_DB } from "../consts";
import { otherColor, iconBackgroundStyles } from "../colors";
import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import { Button, Title, NavLink, Loader, Divider, Stack } from "@mantine/core";
import { IconPlus } from '@tabler/icons-react';

export type Book = {
  id: string;
  name: string;
  trash: number | boolean;
  icon: string | null;
  iconColor: string | null;
};

type BooksProps = {
  onSelectBook: React.Dispatch<React.SetStateAction<string | null>>;
  reload: boolean;
};

function Books({ onSelectBook, reload }: BooksProps) {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [trashes, setTrashes] = useState<Book[] | null>(null);

  useEffect(() => {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        const bs = await db.select<Book[]>("SELECT id, name, trash, icon, icon_color AS iconColor FROM books WHERE id <> 'trash' AND trash = 0 ORDER BY name ASC");
        const ts = await db.select<Book[]>("SELECT id, name, trash, icon, icon_color AS iconColor FROM books WHERE id <> 'trash' AND trash = 1 ORDER BY name ASC");
        const res = await db.select<Book[]>("SELECT id, name, trash, icon, icon_color AS iconColor FROM books WHERE id = 'trash'");
        const bs_ = bs.map(b => ({ ...b, trash: b.trash === 1 }));
        setBooks(bs_);
        const ts_ = [ ...ts, res[0] ].map(b => ({ ...b, trash: b.trash === 1 }));
        setTrashes(ts_);
      } catch(e) {
        console.error("Fetching Books Failed", e);
      }
    }
    go();
  }, [reload]);

  function renderBookListing(b: Book) {
    const bg = b.iconColor ? `linear-gradient(45deg, ${b.iconColor}, ${otherColor(b.iconColor)})` : "";
    const iconStyles = b.iconColor ? { ...iconBackgroundStyles, background: bg} : {};
    const icon = b.icon ? (<span style={iconStyles}>{b.icon}</span>) : null;
    return (<NavLink
      key={b.id}
      href="#"
      label={b.name}
      leftSection={icon}
      color={b.trash ? "gray" : ""}
      active={typeof b.trash === "number" ? b.trash === 0 : b.trash}
      onClick={() => onSelectBook(b.id)}
    />);
  }

  const renderedBooks = books
    ? [ 
      ...books.map(renderBookListing),
      <Divider key="divider" my="xs" label="Trashes" labelPosition="center" />,
      ...(trashes || []).map(renderBookListing),
    ]
    : (<Loader color="blue" />);

  function newBook() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        const res = await db.select<{ id: string }[]>("INSERT INTO books (name) VALUES ('') RETURNING id");
        onSelectBook(res[0].id);
      } catch(e) {
        console.error("Fetching Books Failed", e);
      }
    }
    go();
  }

  return (
    <Stack>
      <Title order={3}>Books</Title>
      <Button leftSection={<IconPlus size={14} />} fullWidth onClick={newBook}>New Book</Button>
      <div>
        { renderedBooks }
      </div>
    </Stack>
  );
}

export default Books;
