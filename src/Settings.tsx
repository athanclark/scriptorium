import React from "react";
import { __LOCAL_DB } from "./consts";
import Nav from "./Nav";
import { type ColorScheme } from "./App";
import Document from "./Document";
import { useState, useEffect } from "react";
import { Switch, Divider, Burger, TextInput, Button, Typography, ActionIcon, Modal, Loader, Title, Grid, Stack, NativeSelect, NumberInput, PasswordInput, useComputedColorScheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSettings, IconPlus, IconCheck, IconTrash, IconCancel, IconEdit } from "@tabler/icons-react";
import Database from "@tauri-apps/plugin-sql";

type DatabaseType = "mysql" | "postgresql";

type RemoteServer = {
  dbType: DatabaseType;
  host: string;
  port: number;
  db: string;
  user: string;
  password: string;
};

function defaultPort(t: DatabaseType): number {
  if (t === "mysql") {
    return 3306;
  } else {
    return 5432;
  }
}

const defaultRemoteServer = {
  dbType: "mysql",
  host: "localhost",
  port: defaultPort("mysql"),
  db: "mysql",
  user: "mysql",
  password: "",
};

type SettingsProps = {
  colorScheme: ColorScheme;
  setColorScheme: React.Dispatch<React.SetStateAction<ColorScheme>>;
}

function Settings({ colorScheme, setColorScheme }: SettingsProps) {
  const [newRemoteServer, setNewRemoteServer] = useState<RemoteServer>(defaultRemoteServer);
  const [remoteServers, setRemoteServers] = useState<(RemoteServer & {id: string, editing: boolean})[] | null>(null);

  function actuallyReload() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        const ss = await db.select<(RemoteServer & { id: string })[]>(
          "SELECT id, host, port, db, user, password, db_type AS dbType FROM remote_servers",
          []
        );
        setRemoteServers(ss.map(s => ({ ...s, editing: false })));
      } catch(e) {
        console.error("Fetching remote servers Failed", e);
      }
    }
    go();
  }

  useEffect(() => {
    actuallyReload();
  }, []);

  function addRemoteServer() {
    const s = newRemoteServer;
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute(
          "INSERT INTO remote_servers (host, port, db, user, password, db_type) VALUES ($1, $2, $3, $4, $5, $6)",
          [s.host, s.port, s.db, s.user, s.password, s.dbType]
        );
        actuallyReload();
        setNewRemoteServer(defaultRemoteServer);
      } catch(e) {
        console.error("Couldn't insert new remote server", e);
      }
    }
    go();
  }

  function editRemoteServer(newS: RemoteServer & { id: string, editing: boolean }) {
    setRemoteServers(remoteServers.map(s => s.id === newS.id ? { ...s, ...newS } : { ...s, editing: false }));
  }

  function viewRemoteServer(s: RemoteServer & { id: string, editing: boolean }) {
    function saveRemoteServer() {
      async function go() {
        try {
          const db = await Database.load(__LOCAL_DB);
          await db.execute(
            "UPDATE remote_servers (host, port, db, user, password, db_type) SET ($1, $2, $3, $4, $5, $6) WHERE id = $7",
            [s.host, s.port, s.db, s.user, s.password, s.dbType, s.id]
          );
          actuallyReload();
          setNewRemoteServer(defaultRemoteServer);
        } catch(e) {
          console.error("Couldn't insert new remote server", e);
        }
      }
      go();
    }
    function deleteRemoteServer() {
      async function go() {
        try {
          const db = await Database.load(__LOCAL_DB);
          await db.execute(
            "DELETE FROM remote_servers WHERE id = $1",
            [s.id]
          );
          actuallyReload();
          setNewRemoteServer(defaultRemoteServer);
        } catch(e) {
          console.error("Couldn't insert new remote server", e);
        }
      }
      go();
    }
    if (s.editing) {
      return (
        <React.Fragment key={s.id}>
          <Grid.Col span={2}>
            <NativeSelect
              label="Database Type"
              value={s.dbType}
              onChange={e => {
                var v = e.currentTarget.selectedOptions[0].value;
                if (v === "mysql" || v === "postgresql") {
                  editRemoteServer({ ...s, dbType: v });
                }
              }}
              data={[{label: "MySQL", value: "mysql"}, {label: "PostgreSQL", value: "mysql"}]}
            />
          </Grid.Col>
          <Grid.Col span={2}>
            <TextInput
              label="Host"
              value={s.host}
              onChange={e => editRemoteServer({ ...s, host: e.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={1}>
            <NumberInput
              label="Port"
              value={s.port}
              onChange={e => editRemoteServer({ ...s, port: Number(e.currentTarget.value) })}
            />
          </Grid.Col>
          <Grid.Col span={2}>
            <TextInput
              label="Database"
              value={s.db}
              onChange={e => editRemoteServer({ ...s, db: e.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={2}>
            <TextInput
              label="Username"
              value={s.user}
              onChange={e => editRemoteServer({ ...s, user: e.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={2}>
            <PasswordInput
              label="Password"
              value={s.password}
              onChange={e => editRemoteServer({ ...s, password: e.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={1} style={{display: "flex", alignItems: "center", justifyContent: "space-around"}}>
            <ActionIcon color="green" onClick={saveRemoteServer}><IconCheck /></ActionIcon>
            <ActionIcon color="red" onClick={deleteRemoteServer}><IconTrash /></ActionIcon>
            <ActionIcon color="gray" onClick={() => {
              editRemoteServer({ ...s, editing: false });
              actuallyReload();
            }}><IconCancel /></ActionIcon>
          </Grid.Col>
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment key={s.id}>
          <Grid.Col span={2}>
            { s.dbType === "mysql" ? "MySQL" : "PostgreSQL" }
          </Grid.Col>
          <Grid.Col span={2}>
            { s.host }
          </Grid.Col>
          <Grid.Col span={1}>
            { s.port }
          </Grid.Col>
          <Grid.Col span={2}>
            { s.db }
          </Grid.Col>
          <Grid.Col span={2}>
            { s.user }
          </Grid.Col>
          <Grid.Col span={2}>
            *****
          </Grid.Col>
          <Grid.Col span={1} style={{display: "flex", alignItems: "center", justifyContent: "space-around"}}>
            <ActionIcon onClick={() => editRemoteServer({ ...s, editing: true })}><IconEdit /></ActionIcon>
          </Grid.Col>
        </React.Fragment>
      );
    }
  }

  return (
    <Stack>
      <Title order={3}>Add Remote Server</Title>
      <Grid>
        <Grid.Col span={2}>
          <NativeSelect
            label="Database Type"
            value={newRemoteServer.dbType}
            onChange={e => {
              var v = e.currentTarget.selectedOptions[0].value;
              if (v === "mysql" || v === "postgresql") {
                setNewRemoteServer({ ...newRemoteServer, dbType: v });
              }
            }}
            data={[{label: "MySQL", value: "mysql"}, {label: "PostgreSQL", value: "mysql"}]}
          />
        </Grid.Col>
        <Grid.Col span={2}>
          <TextInput
            label="Host"
            value={newRemoteServer.host}
            onChange={e => setNewRemoteServer({ ...newRemoteServer, host: e.currentTarget.value })}
          />
        </Grid.Col>
        <Grid.Col span={1}>
          <NumberInput
            label="Port"
            value={newRemoteServer.port}
            onChange={e => setNewRemoteServer({ ...newRemoteServer, port: Number(e.currentTarget.value) })}
          />
        </Grid.Col>
        <Grid.Col span={2}>
          <TextInput
            label="Database"
            value={newRemoteServer.db}
            onChange={e => setNewRemoteServer({ ...newRemoteServer, db: e.currentTarget.value })}
          />
        </Grid.Col>
        <Grid.Col span={2}>
          <TextInput
            label="Username"
            value={newRemoteServer.user}
            onChange={e => setNewRemoteServer({ ...newRemoteServer, user: e.currentTarget.value })}
          />
        </Grid.Col>
        <Grid.Col span={2}>
          <PasswordInput
            label="Password"
            value={newRemoteServer.password}
            onChange={e => setNewRemoteServer({ ...newRemoteServer, password: e.currentTarget.value })}
          />
        </Grid.Col>
        <Grid.Col span={1} style={{display: "flex", alignItems: "center", justifyContent: "space-around"}}>
          <ActionIcon
            disabled={remoteServers && remoteServers.filter(s => s.host === newRemoteServer.host && s.db === newRemoteServer.db && s.port === newRemoteServer.port).length > 0}
            onClick={addRemoteServer}
          ><IconPlus /></ActionIcon>
        </Grid.Col>
      </Grid>
      <Title order={3}>Saved Remote Servers</Title>
      <Grid>
        { remoteServers ? remoteServers.map(viewRemoteServer) : <Loader /> }
      </Grid>
      <Divider label="Synchronization Settings" />
      <ArbitrarySettings colorScheme={colorScheme} setColorScheme={setColorScheme} />
    </Stack>
  );
}

type ArbitrarySettingsProps = {
  colorScheme: ColorScheme;
  setColorScheme: React.Dispatch<React.SetStateAction<ColorScheme>>;
}

function ArbitrarySettings({ colorScheme, setColorScheme }: ArbitrarySettingsProps) {
  function changeColorScheme(c: ColorScheme) {
    console.log("setting color scheme", c);
    setColorScheme(c);
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute(
          "INSERT INTO settings (key, value) VALUES ('color_scheme', $1) ON CONFLICT(key) DO UPDATE SET value = $1",
          [c]
        );
      } catch(e) {
        console.error("Couldn't save color scheme", e);
      }
    }
    go();
  }

  return (
    <>
      <Switch label="Automatically Synchronize" />
      <NumberInput label="Synchronization Interval (ms)" value={500} />
      <Button>Synchronize Now</Button>
      <Divider />
      <Title order={2}>Additional Settings</Title>
      <NativeSelect
        label="Color Scheme"
        value={colorScheme}
        onChange={e => changeColorScheme(e.currentTarget.selectedOptions[0].value)}
        data={[
          {label: "System", value: "auto"},
          {label: "Dark", value: "dark"},
          {label: "Light", value: "light"},
        ]}
      />
    </>
  );
}

export default Settings;
