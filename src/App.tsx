import Nav from "./Nav";
import Document from "./Document";
import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { AppShell, Burger, Button, TextInput, Typography, Drawer } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
// import "./App.css";

function App() {
  // const [greetMsg, setGreetMsg] = useState("");
  // const [name, setName] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [reloadNav, setReloadNav] = useState(false);
  const [reloadDoc, setReloadDoc] = useState(false);
  const [opened, { toggle }] = useDisclosure();

  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  //   setGreetMsg(await invoke("greet", { name }));
  // }

  return (
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
        <Burger
          opened={opened}
          onClick={toggle}
          hiddenFrom="sm"
          size="sm"
        />
        <div>Scriptorium</div>
      </AppShell.Header>

      <AppShell.Navbar>
        <Nav
          onSelectDocument={setSelectedDoc}
          onChangeBooks={() => setReloadDoc(!reloadDoc)}
          reload={reloadNav}
        />
      </AppShell.Navbar>

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
            />
            : <Info />
        }
      </AppShell.Main>
    </AppShell>
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

//        <Typography>
//          <h1>Welcome to Tauri + React</h1>
//
//          <div className="row">
//            <a href="https://vitejs.dev" target="_blank">
//              <img src="/vite.svg" className="logo vite" alt="Vite logo" />
//            </a>
//            <a href="https://tauri.app" target="_blank">
//              <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
//            </a>
//            <a href="https://reactjs.org" target="_blank">
//              <img src={reactLogo} className="logo react" alt="React logo" />
//            </a>
//          </div>
//          <p>Click on the Tauri, Vite, and React logos to learn more.</p>
//        </Typography>
//
//        <form
//          className="row"
//          onSubmit={(e) => {
//            e.preventDefault();
//            greet();
//          }}
//        >
//          <TextInput
//            id="greet-input"
//            onChange={(e) => setName(e.currentTarget.value)}
//            placeholder="Enter a name..."
//          />
//          <Button type="submit">Greet</Button>
//        </form>
//        <Typography>
//          <p>{greetMsg}</p>
//        </Typography>
