import React from "react";
import { __LOCAL_DB } from "./consts";
import Nav from "./Nav";
import Document from "./Document";
import Settings from "./Settings";
import { useState, useEffect, useRef } from "react";
import { MantineProvider, AppShell, Burger, TextInput, Typography, ActionIcon, Modal, Title, Grid, Stack, NativeSelect, NumberInput, PasswordInput, useComputedColorScheme } from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { IconSettings, IconPlus } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// function useSystemColorScheme(): 'light' | 'dark' {
//
//   useEffect(() => {
//     setTimeout(() => {
//       const s = get();
//       setScheme(s);
//     }, 1000);
//     return () => m.removeEventListener('change', handler);
//   }, []);
//
//   return scheme;
// }
//

type ColorScheme = "auto" | "light" | "dark";

function App() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [reloadNav, setReloadNav] = useState(false);
  const [reloadDoc, setReloadDoc] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState<ColorScheme>("auto");
  const [autoSync, setAutoSync] = useState<boolean>(false);
  const [autoSyncTime, setAutoSyncTime] = useState<number>(5);
  const autoSyncThreadRef = useRef(null);
  const [opened, { toggle }] = useDisclosure();

  // NOTE: may need a ref to manage threads
  // FIXME: I need to set the timeout manually on each invocation

  function attemptSync() {
    console.log("stubbed attempt sync - will likely do an `invoke`");
    async function go() {
      try {
        await invoke("sync_databases");
      } catch(e) {
        console.warn("sync_databases failed", e);
        notifications.show({
          title: "Auto Synchronization of Databases Failed",
          message: e.join("\n") + "\n Auto synchronization turned off.",
          color: "red",
          autoClose: false,
        })
        setAutoSync(false);
      }
    }
    go();
  }

  useEffect(() => {
    console.log("autoSync");
    if (!autoSync && autoSyncThreadRef.current) {
      console.log("no autoSync yet thread");
      // remove and cancel thread
      clearInterval(autoSyncThreadRef.current);
      autoSyncThreadRef.current = null;
    } else if (autoSync && !autoSyncThreadRef.current) {
      console.log("autoSync yet no thread");
      // create thread
      autoSyncThreadRef.current = setInterval(attemptSync, autoSyncTime * 1000);
    } else if (autoSync && autoSyncThreadRef.current) {
      console.log("autoSync time change", autoSyncThreadRef.current, autoSyncTime);
      // adjust interval time
      clearInterval(autoSyncThreadRef.current);
      autoSyncThreadRef.current = setInterval(attemptSync, autoSyncTime * 1000);
    }
  }, [autoSync, autoSyncTime]);
  
  useEffect(() => {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        
        // color scheme
        const vs = await db.select<{ value: string }[]>(
          "SELECT value FROM settings WHERE key = 'color_scheme'",
          []
        );
        if (vs[0]) {
          setColorScheme(vs[0].value)
        }

        // auto sync
        const newAutoSync = await db.select<{ value: string }[]>(
          "SELECT value FROM settings WHERE key = 'auto_sync'",
          []
        );
        if (newAutoSync.length > 0 && newAutoSync[0].value === "true") {
          setAutoSync(true);
        }
        const newAutoSyncTime = await db.select<{ value: string }[]>(
          "SELECT value FROM settings WHERE key = 'auto_sync_time'",
          []
        );
        if (newAutoSyncTime.length > 0) {
          setAutoSyncTime(Number(newAutoSyncTime[0].value));
        }
      } catch(e) {
        console.error("Couldn't select initial values", e);
      }
    }
    go();
  }, []);

  return (
    <MantineProvider forceColorScheme={colorScheme}>
      <Notifications />
      <AppShell
        padding="md"
        header={{ height: 30 }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !opened }
        }}
      >
        <AppShell.Header>
          <Header
            opened={opened}
            toggle={toggle}
            colorScheme={colorScheme}
            setColorScheme={setColorScheme}
            autoSync={autoSync}
            setAutoSync={setAutoSync}
            autoSyncTime={autoSyncTime}
            setAutoSyncTime={setAutoSyncTime}
          />
        </AppShell.Header>

        <NavbarWrapper
          setSelectedDoc={setSelectedDoc}
          onChangeBooks={() => setReloadDoc(!reloadDoc)}
          reloadNav={reloadNav}
          selectedBook={selectedBook}
          setSelectedBook={setSelectedBook}
        />

        <AppShell.Main>
          {
            selectedDoc
              ? <Document
                doc={selectedDoc}
                reload={reloadDoc}
                onUpdateDocument={() => setReloadNav(!reloadNav)}
                onDeleteDocument={() => {
                  setSelectedDoc(null);
                  setReloadNav(!reloadNav);
                }}
                toBook={(newBook: string) => setSelectedBook(newBook)}
              />
              : <Info />
          }
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

type HeaderProps = {
  opened: boolean;
  toggle: () => void;
  colorScheme: ColorScheme;
  setColorScheme: React.Dispatch<React.SetStateAction<ColorScheme>>;
  autoSync: boolean;
  setAutoSync: React.Dispatch<React.SetStateAction<boolean>>;
  autoSyncTime: number;
  setAutoSyncTime: React.Dispatch<React.SetStateAction<number>>;
}

function Header({opened, toggle, colorScheme, setColorScheme, autoSync, setAutoSync, autoSyncTime, setAutoSyncTime}: HeaderProps) {
  const computedColorScheme = useComputedColorScheme();
  const [openedSettings, { open: openSettings, close: closeSettings }] = useDisclosure();

  return (
    <div style={{display: "flex", justifyContent: "space-between"}}>
      <Modal opened={openedSettings} onClose={closeSettings} title="Settings" size="100%">
        <Settings
          colorScheme={colorScheme}
          setColorScheme={setColorScheme}
          autoSync={autoSync}
          setAutoSync={setAutoSync}
          autoSyncTime={autoSyncTime}
          setAutoSyncTime={setAutoSyncTime}
        />
      </Modal>
      <Burger
        opened={opened}
        onClick={toggle}
        hiddenFrom="sm"
        size="sm"
      />
      <div>Scriptorium</div>
      <ActionIcon onClick={openSettings} variant="transparent" color={computedColorScheme === "light" ? "black" : "white"} aria-label="Settings"><IconSettings /></ActionIcon>
    </div>
  );
}

type NavbarWrapperProps = {
  setSelectedDoc: React.Dispatch<React.SetStateAction<string | null>>;
  onChangeBooks: () => void;
  reloadNav: boolean;
  selectedBook: string | null;
  setSelectedBook: React.Dispatch<React.SetStateAction<string | null>>;
};

function NavbarWrapper({ setSelectedDoc, onChangeBooks, reloadNav, selectedBook, setSelectedBook }: NavbarWrapperProps) {
  const colorScheme = useComputedColorScheme();
  const bg = colorScheme === "dark" ? "--mantine-color-dark-5" : "--mantine-color-indigo-1";

  return (
    <AppShell.Navbar style={{background: `var(${bg})`}}>
      <Nav
        onSelectDocument={setSelectedDoc}
        onChangeBooks={onChangeBooks}
        reload={reloadNav}
        selectedBook={selectedBook}
        setSelectedBook={setSelectedBook}
      />
    </AppShell.Navbar>
  );
}

function Info() {
  return (
    <Typography>
      <p>Select or create a Document to begin taking notes. Documents live inside Books.</p>
    </Typography>
  );
}

export default App;
