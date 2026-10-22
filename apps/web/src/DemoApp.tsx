import { GameSessionView } from "./App.js";
import { LocalDemoNotice } from "./components/LocalDemoNotice.js";
import { useDemoRunSync } from "./game/useDemoRunSync.js";

export function DemoApp() {
  const sync = useDemoRunSync();
  return <div className="local-demo-root"><LocalDemoNotice /><GameSessionView sync={sync} /></div>;
}
