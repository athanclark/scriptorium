import Nav from "./Nav";
import Document from "./Document";
import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { AppShell, Burger, Button, TextInput, Typography, Drawer, ActionIcon, Modal, Title, Grid, Stack, NativeSelect, NumberInput, PasswordInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSettings, IconPlus } from "@tabler/icons-react";
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
  const [openedSettings, { open: openSettings, close: closeSettings }] = useDisclosure();

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
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <Modal opened={openedSettings} onClose={closeSettings} title="Settings" size="auto">
            <Settings />
          </Modal>
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
          />
          <div>Scriptorium</div>
          <ActionIcon onClick={openSettings} variant="transparent" color="black" aria-label="Settings"><IconSettings /></ActionIcon>
        </div>
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

function Settings() {
  return (
    <Stack>
      <Title order={2}>Remote Servers</Title>
      <Grid>
        <Grid.Col span={2}>
          <NativeSelect label="Database Type" data={["MySQL", "PostgreSQL"]} />
        </Grid.Col>
        <Grid.Col span={2}>
          <TextInput label="Host" />
        </Grid.Col>
        <Grid.Col span={1}>
          <NumberInput label="Port" />
        </Grid.Col>
        <Grid.Col span={2}>
          <TextInput label="Database" />
        </Grid.Col>
        <Grid.Col span={2}>
          <TextInput label="Username" />
        </Grid.Col>
        <Grid.Col span={2}>
          <PasswordInput label="Password" />
        </Grid.Col>
        <Grid.Col span={1} style={{display: "flex", alignItems: "center", justifyContent: "space-around"}}>
          <ActionIcon><IconPlus /></ActionIcon>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

export default App;
