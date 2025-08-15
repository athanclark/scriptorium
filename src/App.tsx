import Nav from "./Nav";
import Document from "./Document";
import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { AppShell, Burger, Button, TextInput, Typography, Drawer, ActionIcon, Modal, Title, Grid, Stack, NativeSelect, NumberInput, PasswordInput, MantineProvider, useComputedColorScheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSettings, IconPlus } from "@tabler/icons-react";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function useSystemColorScheme(): 'light' | 'dark' {

  useEffect(() => {
    setTimeout(() => {
      const s = get();
      setScheme(s);
    }, 1000);
    return () => m.removeEventListener('change', handler);
  }, []);

  return scheme;
}

function App() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [reloadNav, setReloadNav] = useState(false);
  const [reloadDoc, setReloadDoc] = useState(false);
  const [opened, { toggle }] = useDisclosure();
  const [openedSettings, { open: openSettings, close: closeSettings }] = useDisclosure();
  // const getColorScheme = () =>
  //   (typeof window !== 'undefined' &&
  //     window.matchMedia('(prefers-color-scheme: dark)').matches)
  //     ? 'dark'
  //     : 'light';
  // const [scheme, setScheme] = useState<'light' | 'dark'>(getColorScheme);
  //
  // useEffect(() => {
  //   const m = window.matchMedia('(prefers-color-scheme: dark)');
  //   const handler = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light');
  //   m.addEventListener('change', handler);
  //
  //   setTimeout(() => {
  //     const s = getColorScheme();
  //     console.log('color scheme again', s);
  //     setScheme(s);
  //   }, 2000)
  // }, []);
  //
  // console.log("scheeeeme", scheme);

  return (
    <MantineProvider defaultColorScheme="auto">
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

        <NavbarWrapper setSelectedDoc={setSelectedDoc} setReloadDoc={setReloadDoc} reloadDoc={reloadDoc} reloadNav={reloadNav} />

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
    </MantineProvider>
  );
}

function NavbarWrapper({ setSelectedDoc, setReloadDoc, reloadDoc, reloadNav }) {
  const colorScheme = useComputedColorScheme("auto");
  const bg = colorScheme === "dark" ? "--mantine-color-dark-5" : "--mantine-color-indigo-1";

  return (
    <AppShell.Navbar style={{background: `var(${bg})`}}>
      <Nav
        onSelectDocument={setSelectedDoc}
        onChangeBooks={() => setReloadDoc(!reloadDoc)}
        reload={reloadNav}
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
