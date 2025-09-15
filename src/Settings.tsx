// Copyright (C) 2025  Athan Clark
import React from "react";
import { __LOCAL_DB } from "./consts";
import { type ColorScheme } from "./App";
import { type Syntax } from "./Document/Editor";
import { useState, useEffect } from "react";
import { Switch, Table, Divider, TextInput, Button, Alert, ActionIcon, Title, Grid, Stack, NativeSelect, NumberInput, PasswordInput } from "@mantine/core";
import { IconPlus, IconCheck, IconTrash, IconCancel, IconEdit } from "@tabler/icons-react";
import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import "./Settings.css";

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

const defaultRemoteServer: RemoteServer = {
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
  autoSync: boolean;
  setAutoSync: React.Dispatch<React.SetStateAction<boolean>>;
  autoSyncTime: number;
  setAutoSyncTime: React.Dispatch<React.SetStateAction<number>>;
  editAndView: boolean;
  setEditAndView: React.Dispatch<React.SetStateAction<boolean>>;
  defaultSyntax: Syntax;
  setDefaultSyntax: React.Dispatch<React.SetStateAction<Syntax>>;
  synchronize: () => void;
  allowToClose: React.Dispatch<React.SetStateAction<boolean>>;
}

function Settings({
  colorScheme, setColorScheme,
  autoSync, setAutoSync,
  autoSyncTime, setAutoSyncTime,
  editAndView, setEditAndView,
  defaultSyntax, setDefaultSyntax,
  synchronize,
  allowToClose,
}: SettingsProps) {
  const [newRemoteServer, setNewRemoteServer] = useState<RemoteServer>(defaultRemoteServer);
  const [remoteServers, setRemoteServers] = useState<(RemoteServer & {id: string, editing: boolean, verified: boolean | string | null})[]>([]);
  const [migrating, setMigrating] = useState<number>(0);

  useEffect(() => {
    if (migrating > 0) {
      allowToClose(false);
    } else {
      allowToClose(true);
    }
  }, [migrating]);

  function verifyServer(s: RemoteServer & {id: string}) {
    async function go() {
      setRemoteServers(ss => ss.map(s_ => s_.id === s.id ? { ...s_, verified: null } : s_));
      let verified: boolean | string | null = null;
      try {
        setMigrating(n => n+1);
        verified = await invoke("check_database", { dbId: s.id });
        setMigrating(n => n-1);
      } catch(e) {
        verified = String(e);
        setMigrating(n => n-1);
      }
      setRemoteServers(ss => ss.map(s_ => s_.id === s.id ? { ...s_, verified: verified } : s_));
    }
    go();
  }

  function actuallyReload() {
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        const ss = await db.select<(RemoteServer & { id: string })[]>(
          "SELECT id, host, port, db, user, password, db_type AS dbType FROM remote_servers",
          []
        );
        setRemoteServers(ss.map(s => ({ ...s, editing: false, verified: null })));

        for (const s of ss) {
          verifyServer(s)
        }
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
        // FIXME check health of connection first?
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

  function editRemoteServer(newS: RemoteServer & { id: string, editing: boolean, verified: boolean | string | null }) {
    setRemoteServers(ss => ss.map(s => s.id === newS.id ? { ...s, ...newS } : { ...s, editing: false }));
  }

  function viewRemoteServer(s: RemoteServer & { id: string, editing: boolean, verified: boolean | string | null }) {
    function saveRemoteServer() {
      async function go() {
        try {
          const db = await Database.load(__LOCAL_DB);
          await db.execute(
            "UPDATE remote_servers SET host = $1, port = $2, db = $3, user = $4, password = $5, db_type = $6 WHERE id = $7",
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
        <Table.Tr key={s.id}>
          <Table.Td>
            <NativeSelect
              label="Database Type"
              value={s.dbType}
              onChange={e => {
                var v = e.currentTarget.selectedOptions[0].value;
                if (v === "mysql" || v === "postgresql") {
                  // @ts-ignore
                  editRemoteServer({ ...s, dbType: v });
                }
              }}
              data={[{label: "MySQL", value: "mysql"}, {label: "PostgreSQL", value: "postgresql"}]}
            />
          </Table.Td>
          <Table.Td>
            <TextInput
              label="Host"
              value={s.host}
              onChange={e => editRemoteServer({ ...s, host: e.currentTarget.value })}
            />
          </Table.Td>
          <Table.Td>
            <NumberInput
              label="Port"
              value={s.port}
              onChange={e => editRemoteServer({ ...s, port: Number(e) })}
            />
          </Table.Td>
          <Table.Td>
            <TextInput
              label="Database"
              value={s.db}
              onChange={e => editRemoteServer({ ...s, db: e.currentTarget.value })}
            />
          </Table.Td>
          <Table.Td>
            <TextInput
              label="Username"
              value={s.user}
              onChange={e => editRemoteServer({ ...s, user: e.currentTarget.value })}
            />
          </Table.Td>
          <Table.Td>
            <PasswordInput
              label="Password"
              value={s.password}
              onChange={e => editRemoteServer({ ...s, password: e.currentTarget.value })}
            />
          </Table.Td>
          <Table.Td style={{display: "flex", alignItems: "center", justifyContent: "space-around"}}>
            <ActionIcon color="green" onClick={saveRemoteServer}><IconCheck /></ActionIcon>
            <ActionIcon color="red" onClick={deleteRemoteServer}><IconTrash /></ActionIcon>
            <ActionIcon color="gray" onClick={() => {
              editRemoteServer({ ...s, editing: false });
              actuallyReload();
            }}><IconCancel /></ActionIcon>
          </Table.Td>
        </Table.Tr>
      );
    } else {
      return (
        <Table.Tr key={s.id}>
          <Table.Td>
            { s.dbType === "mysql" ? "MySQL" : "PostgreSQL" }
          </Table.Td>
          <Table.Td>
            { s.host }
          </Table.Td>
          <Table.Td>
            { s.port }
          </Table.Td>
          <Table.Td>
            { s.db }
          </Table.Td>
          <Table.Td>
            { s.user }
          </Table.Td>
          <Table.Td>
            *****
          </Table.Td>
          <Table.Td style={{display: "flex", alignItems: "center", justifyContent: "space-around"}}>
            <ActionIcon onClick={() => editRemoteServer({ ...s, editing: true })}><IconEdit /></ActionIcon>
          </Table.Td>
          <Table.Td>
            {
              typeof s.verified === "string"
                ? (<Stack><Alert color="red" title="Verification Issue">{s.verified}</Alert><Button onClick={() => verifyServer(s)}>Verify Now</Button></Stack>)
                : s.verified === true
                ? (<Button fullWidth onClick={() => verifyServer(s)}>Re-Verify Now</Button>)
                : s.verified === null
                ? (<Button disabled loading fullWidth />)
                : null
            }
          </Table.Td>
        </Table.Tr>
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
            data={[{label: "MySQL", value: "mysql"}, {label: "PostgreSQL", value: "postgresql"}]}
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
            onChange={e => setNewRemoteServer({ ...newRemoteServer, port: Number(e) })}
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
            disabled={(remoteServers && remoteServers.filter(s => s.host === newRemoteServer.host && s.db === newRemoteServer.db && s.port === newRemoteServer.port).length > 0) || false}
            onClick={addRemoteServer}
          ><IconPlus /></ActionIcon>
        </Grid.Col>
      </Grid>
      <Title order={3}>Saved Remote Servers</Title>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Database Type</Table.Th>
            <Table.Th>Host</Table.Th>
            <Table.Th>Port</Table.Th>
            <Table.Th>Database</Table.Th>
            <Table.Th>Username</Table.Th>
            <Table.Th>Password</Table.Th>
            <Table.Th>Actions</Table.Th>
            <Table.Th>Verification Issues</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {remoteServers.map(viewRemoteServer)}
        </Table.Tbody>
      </Table>
      <Divider label="Synchronization Settings" />
      <ArbitrarySettings
        colorScheme={colorScheme}
        setColorScheme={setColorScheme}
        autoSync={autoSync}
        setAutoSync={setAutoSync}
        autoSyncTime={autoSyncTime}
        setAutoSyncTime={setAutoSyncTime}
        editAndView={editAndView}
        setEditAndView={setEditAndView}
        defaultSyntax={defaultSyntax}
        setDefaultSyntax={setDefaultSyntax}
        synchronize={synchronize}
      />
    </Stack>
  );
}

type ArbitrarySettingsProps = {
  colorScheme: ColorScheme;
  setColorScheme: React.Dispatch<React.SetStateAction<ColorScheme>>;
  autoSync: boolean;
  setAutoSync: React.Dispatch<React.SetStateAction<boolean>>;
  autoSyncTime: number;
  setAutoSyncTime: React.Dispatch<React.SetStateAction<number>>;
  editAndView: boolean;
  setEditAndView: React.Dispatch<React.SetStateAction<boolean>>;
  defaultSyntax: Syntax;
  setDefaultSyntax: React.Dispatch<React.SetStateAction<Syntax>>;
  synchronize: () => void;
}

function ArbitrarySettings({
  colorScheme, setColorScheme,
  autoSync, setAutoSync,
  autoSyncTime, setAutoSyncTime,
  editAndView, setEditAndView,
  defaultSyntax, setDefaultSyntax,
  synchronize,
}: ArbitrarySettingsProps) {

  function changeColorScheme(c: ColorScheme) {
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

  function changeAutoSync(a: boolean) {
    setAutoSync(a)
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        db.execute(
          "INSERT INTO settings (key, value) VALUES ('auto_sync', $1) ON CONFLICT(key) DO UPDATE SET value = $1",
          [String(a)]
        );
      } catch(e) {
        console.error("Couldn't save auto sync", e);
      }
    }
    go();
  }

  function changeAutoSyncTime(a: number) {
    setAutoSyncTime(a)
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        db.execute(
          "INSERT INTO settings (key, value) VALUES ('auto_sync_time', $1) ON CONFLICT(key) DO UPDATE SET value = $1",
          [String(a)]
        );
      } catch(e) {
        console.error("Couldn't save auto sync time", e);
      }
    }
    go();
  }

  function changeEditAndView(a: boolean) {
    setEditAndView(a)
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        db.execute(
          "INSERT INTO settings (key, value) VALUES ('edit_and_view', $1) ON CONFLICT(key) DO UPDATE SET value = $1",
          [String(a)]
        );
      } catch(e) {
        console.error("Couldn't save edit and view", e);
      }
    }
    go();
  }

  function changeDefaultSyntax(s: Syntax) {
    setDefaultSyntax(s);
    async function go() {
      try {
        const db = await Database.load(__LOCAL_DB);
        await db.execute(
          "INSERT INTO settings (key, value) VALUES ('default_syntax', $1) ON CONFLICT(key) DO UPDATE SET value = $1",
          [s]
        );
      } catch(e) {
        console.error("Couldn't save default syntax", e);
      }
    }
    go();
  }

  return (
    <>
      <Switch checked={autoSync} onChange={e => changeAutoSync(e.currentTarget.checked)} label="Automatically Synchronize" />
      <NumberInput value={autoSyncTime} onChange={e => changeAutoSyncTime(Number(e))} label="Seconds Between Synchronizations" />
      <Button onClick={synchronize}>Synchronize Now</Button>
      <Divider />
      <Title order={2}>Additional Settings</Title>
      <NativeSelect
        label="Color Scheme"
        value={colorScheme}
        // @ts-ignore
        onChange={e => changeColorScheme(e.currentTarget.selectedOptions[0].value)}
        data={[
          {label: "System", value: "auto"},
          {label: "Dark", value: "dark"},
          {label: "Light", value: "light"},
        ]}
      />
      <Switch checked={editAndView} onChange={e => changeEditAndView(e.currentTarget.checked)} label="View and Edit Documents at the Same Time" />
      <NativeSelect
        label="Default Syntax"
        value={defaultSyntax}
        // @ts-ignore
        onChange={e => changeDefaultSyntax(e.currentTarget.selectedOptions[0].value)}
        data={[
          {label: "Markdown", value: "md"},
          {label: "ASCIIDoc", value: "adoc"},
          {label: "HTML", value: "html"},
        ]}
      />
    </>
  );
}

export default Settings;
